from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os
import pymongo
import pandas as pd
from prophet import Prophet
from bson import ObjectId
from datetime import datetime

load_dotenv()

app = Flask(__name__)

# --- Database Connection ---
try:
    mongo_uri = os.environ.get("MONGODB_URI")
    if not mongo_uri:
        raise ValueError("MONGODB_URI not found in environment variables")
    client = pymongo.MongoClient(mongo_uri)
    db = client.get_database() 
    # Test connection
    client.admin.command('ping')
    print("MongoDB connection successful.")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    client = None

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
            df_income = df_income.rename(columns={'createdAt': 'ds', 'totalAmount': 'y'})
            df_income['ds'] = pd.to_datetime(df_income['ds'])
        else:
            df_income = pd.DataFrame(columns=['ds', 'y'])

        if not df_expenses.empty:
            df_expenses = df_expenses.rename(columns={'date': 'ds', 'amount': 'y'})
            df_expenses['ds'] = pd.to_datetime(df_expenses['ds'])
            df_expenses['y'] = -df_expenses['y'] # Make expenses negative
        else:
            df_expenses = pd.DataFrame(columns=['ds', 'y'])

        df_cash_flow = pd.concat([df_income[['ds', 'y']], df_expenses[['ds', 'y']]])
        df_cash_flow = df_cash_flow.groupby(pd.Grouper(key='ds', freq='D')).sum().reset_index()
        
        if len(df_cash_flow) < 2:
            return jsonify({"error": "Not enough data points to create a forecast."}), 400

        # --- Forecasting with Prophet ---
        model = Prophet()
        model.fit(df_cash_flow)
        future = model.make_future_dataframe(periods=90) # Forecast 90 days into the future
        forecast_result = model.predict(future)
        
        # --- Format Response ---
        forecast_data = forecast_result[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].to_dict('records')
        
        return jsonify({"forecast_data": forecast_data})

    except Exception as e:
        print(f"An error occurred during forecasting: {e}")
        return jsonify({"error": "An internal error occurred while generating the forecast."}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
