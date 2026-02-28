import { Response } from 'express';
import axios from 'axios';
import { AuthRequest } from '../middleware/auth';

const FORECASTING_SERVICE_URL = process.env.FORECASTING_SERVICE_URL || 'http://localhost:5001';

export const getFinancialForecast = async (req: AuthRequest, res: Response) => {
  const companyId = req.companyId;

  if (!companyId) {
    return res.status(400).json({ message: 'Company ID is required.' });
  }

  try {
    const response = await axios.post(`${FORECASTING_SERVICE_URL}/forecast`, {
      company_id: companyId.toString(),
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error calling forecasting service:', error);
    if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json({
            message: 'Error from forecasting service.',
            error: error.response.data,
        });
    }
    res.status(500).json({ message: 'Failed to get financial forecast.' });
  }
};
