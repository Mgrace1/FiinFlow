from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import pymongo
import pandas as pd
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
    if not company_id:
        return jsonify({"error": "company_id is required"}), 400

    try:
        # --- Data Fetching ---
        invoices_cursor = db.invoices.find({
            "companyId": ObjectId(company_id),
            "status": "paid"
        })
        expenses_cursor = db.expenses.find({"companyId": ObjectId(company_id)})

        invoices = list(invoices_cursor)
        expenses = list(expenses_cursor)

        if not invoices and not expenses:
            return jsonify({"error": "Not enough data to create a forecast."}), 400

        # --- Data Preparation ---
        df_income = pd.DataFrame(invoices)
        df_expenses = pd.DataFrame(expenses)

        # Combine income and expenses into a single cash flow dataframe
        if not df_income.empty:
            income_date_col = 'createdAt' if 'createdAt' in df_income.columns else ('dueDate' if 'dueDate' in df_income.columns else None)
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
            expense_date_col = 'dueDate' if 'dueDate' in df_expenses.columns else ('createdAt' if 'createdAt' in df_expenses.columns else None)
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
                "warning": "Insufficient historical points; returned flat fallback forecast."
            }), 200

        # --- Forecasting with Prophet ---
        model = Prophet()
        model.fit(df_cash_flow)
        future = model.make_future_dataframe(periods=90) # Forecast 90 days into the future
        forecast_result = model.predict(future)
        
        # --- Format Response ---
        forecast_result['ds'] = pd.to_datetime(forecast_result['ds'], errors='coerce').dt.strftime('%Y-%m-%d')
        forecast_data = forecast_result[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records')
        
        return jsonify({"forecast_data": forecast_data})

    except Exception as e:
        print(f"An error occurred during forecasting: {e}")
        return jsonify({"error": "An internal error occurred while generating the forecast."}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
