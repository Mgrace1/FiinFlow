import axios from 'axios';
import { getErrorMessage, notifyError } from '../utils/toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) =>{
    const token = localStorage.getItem('finflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) =>{
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const suppressErrorToast = Boolean(error?.config?.suppressErrorToast);
    if (error.response?.status === 401) {
      // Check if the request URL is for a specific invoice
      if (!error.config.url.includes('/invoices/')) {
        localStorage.removeItem('finflow_token');
        localStorage.removeItem('finflow_company_id');
        window.location.href = '/login';
      }
    }
    if (!suppressErrorToast) {
      notifyError(getErrorMessage(error, 'Request failed'));
    }
    return Promise.reject(error);
  }
);

// ... (previous code) ...




// Function to get financial forecast

export const getForecast = async (params?: { clientId?: string }) => {

  try {

    const response = await apiClient.get('/forecasting/forecast', { params });

    return response.data;

  } catch (error) {

    console.error('Error fetching forecast:', error);

    throw error;

  }

};



