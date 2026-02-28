import { Response } from 'express';
import { extractReceiptData } from '../services/aiService';
import { AuthRequest } from '../middleware/auth';

export const processReceipt = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  const { path, mimetype } = req.file;

  try {
    const data = await extractReceiptData(path, mimetype);
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    // It's good practice to check the error type, but for now, we'll send a generic message.
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ message: 'Failed to process receipt.', error: errorMessage });
  }
};
