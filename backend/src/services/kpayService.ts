import axios from 'axios';
import base64 from 'base-64';

const KPAY_API_URL = 'https://pay.esicia.com/';
const KPAY_API_KEY = process.env.KPAY_API_KEY;
const KPAY_USERNAME = process.env.KPAY_USERNAME;
const KPAY_PASSWORD = process.env.KPAY_PASSWORD;
const KPAY_RETAILER_ID = process.env.KPAY_RETAILER_ID;

const apiClient = axios.create({
  baseURL: KPAY_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Kpay-Key': KPAY_API_KEY,
    'Authorization': `Basic ${base64.encode(`${KPAY_USERNAME}:${KPAY_PASSWORD}`)}`,
  },
});

export const initiatePayment = async (paymentData: {
  msisdn: string;
  email: string;
  details: string;
  refid: string;
  amount: number;
  cname: string;
  cnumber: string;
  pmethod: 'momo' | 'cc' | 'spenn';
  returl: string;
  redirecturl: string;
  logourl?: string;
}) => {
  try {
    const response = await apiClient.post('/', {
      action: 'pay',
      ...paymentData,
      retailerid: KPAY_RETAILER_ID,
    });
    return response.data;
  } catch (error) {
    console.error('K-Pay payment initiation error:', error);
    throw error;
  }
};

export const checkPaymentStatus = async (refid: string) => {
  try {
    const response = await apiClient.post('/', {
      action: 'checkstatus',
      refid,
    });
    return response.data;
  } catch (error) {
    console.error('K-Pay payment status check error:', error);
    throw error;
  }
};
