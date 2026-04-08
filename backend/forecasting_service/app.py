from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import pymongo
import pandas as pd
import numpy as np
from prophet import Prophet
from bson import ObjectId
from pymongo.uri_parser import parse_uri

load_dotenv()

app = Flask(__name__)

# --- Database Connection ---
try:
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise ValueError("MONGODB_URI not found in environment variables")
    client = pymongo.MongoClient(mongo_uri)
    parsed = parse_uri(mongo_uri)
    db_name = os.environ.get("MONGODB_DB_NAME") or parsed.get("database")
    if not db_name:
        raise ValueError("No default database defined. Set MONGODB_DB_NAME or include DB in MONGODB_URI")
    db = client[db_name]
    # Test connection
    client.admin.command('ping')
    print("MongoDB connection successful.")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    client = None

@app.route('/', methods=['GET', 'HEAD'])
def root():
    return jsonify({"status": "ok", "service": "FinFlow-Forecasting"}), 200

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({"status": "ok", "service": "FinFlow-Forecasting"}), 200

@app.route('/forecast', methods=['POST'])
def forecast():
    """
    Generates a financial forecast for a given company.
    """
    if not client:
        return jsonify({"error": "Database connection failed"}), 500

    company_id = request.json.get('company_id')
    client_id = request.json.get('client_id')
    if not company_id:
        return jsonify({"error": "company_id is required"}), 400

    try:
        # --- Data Fetching ---
        invoice_filter = {"companyId": ObjectId(company_id)}
        expense_filter = {"companyId": ObjectId(company_id)}
        if client_id:
            invoice_filter["clientId"] = ObjectId(client_id)
            expense_filter["clientId"] = ObjectId(client_id)

        invoices_cursor = db.invoices.find(invoice_filter)
        expenses_cursor = db.expenses.find(expense_filter)

        invoices = list(invoices_cursor)
        expenses = list(expenses_cursor)

        if not invoices and not expenses:
            return jsonify({"error": "Not enough data to create a forecast."}), 400

        # --- Data Preparation ---
        df_invoices = pd.DataFrame(invoices)
        df_expenses = pd.DataFrame(expenses)

        # Combine income and expenses into a single cash flow dataframe
        if not df_invoices.empty:
            df_income = df_invoices[df_invoices.get('status') == 'paid'].copy()
            income_date_col = 'paidAt' if 'paidAt' in df_income.columns else ('createdAt' if 'createdAt' in df_income.columns else ('dueDate' if 'dueDate' in df_income.columns else None))
            if income_date_col:
                df_income = df_income.rename(columns={income_date_col: 'ds', 'totalAmount': 'y'})
                df_income['ds'] = pd.to_datetime(df_income['ds'], errors='coerce')
                df_income['y'] = pd.to_numeric(df_income['y'], errors='coerce').fillna(0)
                df_income = df_income.dropna(subset=['ds'])
            else:
                df_income = pd.DataFrame(columns=['ds', 'y'])
        else:
            df_income = pd.DataFrame(columns=['ds', 'y'])

        if not df_expenses.empty:
            expense_date_col = 'date' if 'date' in df_expenses.columns else ('dueDate' if 'dueDate' in df_expenses.columns else ('createdAt' if 'createdAt' in df_expenses.columns else None))
            if expense_date_col:
                df_expenses = df_expenses.rename(columns={expense_date_col: 'ds', 'amount': 'y'})
                df_expenses['ds'] = pd.to_datetime(df_expenses['ds'], errors='coerce')
                df_expenses['y'] = pd.to_numeric(df_expenses['y'], errors='coerce').fillna(0)
                df_expenses = df_expenses.dropna(subset=['ds'])
                df_expenses['y'] = -df_expenses['y'] # Make expenses negative
            else:
                df_expenses = pd.DataFrame(columns=['ds', 'y'])
        else:
            df_expenses = pd.DataFrame(columns=['ds', 'y'])

        df_cash_flow = pd.concat([df_income[['ds', 'y']], df_expenses[['ds', 'y']]], ignore_index=True)
        if df_cash_flow.empty:
            return jsonify({"error": "Not enough data to create a forecast."}), 400

        # Force a real datetime column for daily aggregation.
        df_cash_flow['ds'] = pd.to_datetime(df_cash_flow['ds'], errors='coerce', utc=True).dt.tz_convert(None)
        df_cash_flow['y'] = pd.to_numeric(df_cash_flow['y'], errors='coerce').fillna(0)
        df_cash_flow = df_cash_flow.dropna(subset=['ds']).sort_values('ds')

        if df_cash_flow.empty:
            return jsonify({"error": "Not enough valid date points to create a forecast."}), 400

        df_cash_flow = (
            df_cash_flow
            .set_index('ds')
            .resample('D')['y']
            .sum()
            .reset_index()
        )

        # Income-only daily series (for revenue forecasting)
        if not df_income.empty:
            df_income_daily = df_income[['ds', 'y']].copy()
            df_income_daily['ds'] = pd.to_datetime(df_income_daily['ds'], errors='coerce', utc=True).dt.tz_convert(None)
            df_income_daily['y'] = pd.to_numeric(df_income_daily['y'], errors='coerce').fillna(0)
            df_income_daily = df_income_daily.dropna(subset=['ds']).sort_values('ds')
            df_income_daily = (
                df_income_daily
                .set_index('ds')
                .resample('D')['y']
                .sum()
                .reset_index()
            )
        else:
            df_income_daily = pd.DataFrame(columns=['ds', 'y'])

        # --- Rule-based insights & risk ---
        def safe_sum(series):
            return float(pd.to_numeric(series, errors='coerce').fillna(0).sum()) if series is not None else 0.0

        total_revenue = safe_sum(df_income['y']) if not df_income.empty else 0.0
        total_expenses = abs(safe_sum(df_expenses['y'])) if not df_expenses.empty else 0.0

        overdue_amount = 0.0
        pending_amount = 0.0
        if not df_invoices.empty:
            df_invoices['totalAmount'] = pd.to_numeric(df_invoices.get('totalAmount'), errors='coerce').fillna(0)
            df_invoices['amountPaid'] = pd.to_numeric(df_invoices.get('amountPaid'), errors='coerce').fillna(0)
            df_invoices['remaining'] = (df_invoices['totalAmount'] - df_invoices['amountPaid']).clip(lower=0)
            overdue_amount = float(df_invoices[df_invoices.get('status') == 'overdue']['remaining'].sum())
            pending_amount = float(df_invoices[df_invoices.get('status').isin(['sent', 'overdue'])]['remaining'].sum())

        # last 90 days net cashflow
        recent_90 = df_cash_flow.tail(90)
        recent_60 = df_cash_flow.tail(60)
        last_30 = recent_60.tail(30)
        prev_30 = recent_60.head(30) if len(recent_60) >= 60 else pd.DataFrame(columns=['y'])
        avg_last_30 = float(last_30['y'].mean()) if len(last_30) > 0 else 0.0
        avg_prev_30 = float(prev_30['y'].mean()) if len(prev_30) > 0 else 0.0
        negative_days_ratio = float((recent_90['y'] < 0).mean()) if len(recent_90) > 0 else 0.0
        net_last_90 = float(recent_90['y'].sum()) if len(recent_90) > 0 else 0.0

        overdue_ratio = 0.0
        if total_revenue + pending_amount > 0:
            overdue_ratio = overdue_amount / (total_revenue + pending_amount)

        # --- Forecasting with Prophet ---
        
        if len(df_cash_flow) < 2:
            # Graceful fallback for sparse history: flat projection from last known value.
            base_date = df_cash_flow['ds'].max() if not df_cash_flow.empty else pd.Timestamp.utcnow().normalize()
            base_value = float(df_cash_flow['y'].iloc[-1]) if not df_cash_flow.empty else 0.0
            fallback_dates = pd.date_range(start=base_date, periods=91, freq='D')
            forecast_data = [
                {
                    "ds": d.strftime('%Y-%m-%d'),
                    "yhat": base_value,
                    "yhat_lower": base_value,
                    "yhat_upper": base_value,
                }
                for d in fallback_dates
            ]
            return jsonify({
                "forecast_data": forecast_data,
                "summary": {
                    "total_revenue": total_revenue,
                    "total_expenses": total_expenses,
                    "pending_amount": pending_amount,
                    "overdue_amount": overdue_amount,
                    "avg_last_30": avg_last_30,
                    "avg_prev_30": avg_prev_30,
                    "expected_net_90": base_value * 90,
                    "expected_best_90": base_value * 90,
                    "expected_worst_90": base_value * 90,
                    "expected_net_365": base_value * 365,
                    "expected_best_365": base_value * 365,
                    "expected_worst_365": base_value * 365,
                    "expected_revenue_365": float(df_income_daily['y'].iloc[-1]) * 365 if len(df_income_daily) > 0 else 0.0,
                    "expected_revenue_best_365": float(df_income_daily['y'].iloc[-1]) * 365 if len(df_income_daily) > 0 else 0.0,
                    "expected_revenue_worst_365": float(df_income_daily['y'].iloc[-1]) * 365 if len(df_income_daily) > 0 else 0.0,
                },
                "risk": {
                    "score": 0,
                    "level": "low",
                    "reasons": ["Not enough historical data to compute risk."],
                },
                "insights": [
                    {"type": "info", "message": "Insufficient history; using a flat forecast baseline."}
                ],
                "scope": "client" if client_id else "company",
                "warning": "Insufficient historical points; returned flat fallback forecast."
            }), 200

        # --- Forecasting with Prophet ---
        model = Prophet()
        model.fit(df_cash_flow)
        future = model.make_future_dataframe(periods=365) # Forecast 12 months into the future
        forecast_result = model.predict(future)
        
        # --- Format Response ---
        forecast_result['ds'] = pd.to_datetime(forecast_result['ds'], errors='coerce').dt.strftime('%Y-%m-%d')
        forecast_data = forecast_result.tail(90)[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records')

        future_slice_90 = forecast_result.tail(90)
        expected_net_90 = float(pd.to_numeric(future_slice_90['yhat'], errors='coerce').fillna(0).sum())
        expected_best_90 = float(pd.to_numeric(future_slice_90['yhat_upper'], errors='coerce').fillna(0).sum())
        expected_worst_90 = float(pd.to_numeric(future_slice_90['yhat_lower'], errors='coerce').fillna(0).sum())

        future_slice_365 = forecast_result.tail(365)
        expected_net_365 = float(pd.to_numeric(future_slice_365['yhat'], errors='coerce').fillna(0).sum())
        expected_best_365 = float(pd.to_numeric(future_slice_365['yhat_upper'], errors='coerce').fillna(0).sum())
        expected_worst_365 = float(pd.to_numeric(future_slice_365['yhat_lower'], errors='coerce').fillna(0).sum())

        # Revenue-only forecast
        expected_revenue_365 = 0.0
        expected_revenue_best_365 = 0.0
        expected_revenue_worst_365 = 0.0
        if len(df_income_daily) >= 2:
            revenue_model = Prophet()
            revenue_model.fit(df_income_daily)
            revenue_future = revenue_model.make_future_dataframe(periods=365)
            revenue_forecast = revenue_model.predict(revenue_future)
            revenue_slice = revenue_forecast.tail(365)
            expected_revenue_365 = float(pd.to_numeric(revenue_slice['yhat'], errors='coerce').fillna(0).sum())
            expected_revenue_best_365 = float(pd.to_numeric(revenue_slice['yhat_upper'], errors='coerce').fillna(0).sum())
            expected_revenue_worst_365 = float(pd.to_numeric(revenue_slice['yhat_lower'], errors='coerce').fillna(0).sum())
        elif len(df_income_daily) == 1:
            base_revenue = float(df_income_daily['y'].iloc[-1])
            expected_revenue_365 = base_revenue * 365
            expected_revenue_best_365 = base_revenue * 365
            expected_revenue_worst_365 = base_revenue * 365

        # Risk scoring (rule-based)
        risk_score = 0
        reasons = []
        if net_last_90 < 0:
            risk_score += 30
            reasons.append("Recent cashflow is negative over the last 90 days.")
        if avg_last_30 < avg_prev_30:
            risk_score += 20
            reasons.append("Cashflow trend is declining in the last 30 days.")
        if overdue_ratio > 0.4:
            risk_score += 25
            reasons.append("Overdue invoices are high relative to revenue.")
        if total_expenses > total_revenue and (total_revenue + total_expenses) > 0:
            risk_score += 20
            reasons.append("Expenses exceed revenue.")
        if negative_days_ratio > 0.6:
            risk_score += 20
            reasons.append("More than 60% of recent days have negative cashflow.")
        risk_score = int(min(risk_score, 100))
        if risk_score >= 65:
            risk_level = "high"
        elif risk_score >= 35:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Insights
        insights = []
        if expected_net_90 < 0:
            insights.append({"type": "critical", "message": "Expected net cashflow for the next 90 days is negative."})
        else:
            insights.append({"type": "info", "message": "Expected net cashflow for the next 90 days is positive."})
        if overdue_ratio > 0.4:
            insights.append({"type": "warning", "message": "Overdue invoices are above 40% of total receivables."})
        if total_expenses > total_revenue and (total_revenue + total_expenses) > 0:
            insights.append({"type": "warning", "message": "Expenses currently exceed revenue."})
        if avg_last_30 < avg_prev_30:
            insights.append({"type": "warning", "message": "Recent cashflow trend is weakening."})
        if avg_last_30 > avg_prev_30 and avg_prev_30 != 0:
            insights.append({"type": "info", "message": "Recent cashflow trend is improving."})

        return jsonify({
            "forecast_data": forecast_data,
            "summary": {
                "total_revenue": total_revenue,
                "total_expenses": total_expenses,
                "pending_amount": pending_amount,
                "overdue_amount": overdue_amount,
                "avg_last_30": avg_last_30,
                "avg_prev_30": avg_prev_30,
                "expected_net_90": expected_net_90,
                "expected_best_90": expected_best_90,
                "expected_worst_90": expected_worst_90,
                "expected_net_365": expected_net_365,
                "expected_best_365": expected_best_365,
                "expected_worst_365": expected_worst_365,
                "expected_revenue_365": expected_revenue_365,
                "expected_revenue_best_365": expected_revenue_best_365,
                "expected_revenue_worst_365": expected_revenue_worst_365,
            },
            "risk": {
                "score": risk_score,
                "level": risk_level,
                "reasons": reasons,
            },
            "insights": insights,
            "scope": "client" if client_id else "company",
        })

    except Exception as e:
        print(f"An error occurred during forecasting: {e}")
        return jsonify({"error": "An internal error occurred while generating the forecast."}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
