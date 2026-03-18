import { Response } from 'express';
import { Client, Invoice, Expense } from '../models';
import { AuthRequest } from '../middleware/auth';
import { ProfitService } from '../services/profitService';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasMinPhoneDigits = (phone: string): boolean => phone.replace(/\D/g, '').length >= 10;

/**
 * Create a new client
 */
export const createClient = async (req: AuthRequest, res: Response) =>{
  try {
    const name = String(req.body?.name || '').trim();
    const contactPerson = String(req.body?.contactPerson || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const address = String(req.body?.address || '').trim();

    if (!name || !contactPerson || !phone || !email || !address) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields',
      });
    }

    if (!hasMinPhoneDigits(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must contain at least 10 digits',
      });
    }

    // Company name is allowed to repeat. Only client person name, email, or phone must be unique in a workspace.
    const existingClient = await Client.findOne({
      companyId: req.companyId,
      $or: [
        { contactPerson: { $regex: new RegExp(`^${escapeRegex(contactPerson)}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } },
        { phone: phone },
      ],
    });

    if (existingClient) {
      let duplicateField = '';
      if (existingClient.contactPerson.toLowerCase() === contactPerson.toLowerCase()) {
        duplicateField = 'client name';
      } else if (existingClient.email.toLowerCase() === email.toLowerCase()) {
        duplicateField = 'email';
      } else if (existingClient.phone === phone) {
        duplicateField = 'phone';
      }

      return res.status(409).json({
        success: false,
        error: `A client with this ${duplicateField} already exists`,
      });
    }

    const client = await Client.create({
      companyId: req.companyId,
      name,
      contactPerson,
      phone,
      email,
      address,
    });

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: client,
    });
  } catch (error: any) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create client',
    });
  }
};

/**
 * Get all clients
 */
export const getClients = async (req: AuthRequest, res: Response) =>{
  try {
    const filter = req.userRole === 'super_admin' ? {} : { companyId: req.companyId };
    const clients = await Client.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: clients,
    });
  } catch (error: any) {
    console.error('Get clients error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch clients',
    });
  }
};

/**
 * Get single client with summary
 */
export const getClient = async (req: AuthRequest, res: Response) =>{
  try {
    const isSuperAdmin = req.userRole === 'super_admin';
    const client = await Client.findOne(
      isSuperAdmin
        ? { _id: req.params.id }
        : { _id: req.params.id, companyId: req.companyId }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    // Get invoices summary
    const clientCompanyId = (client as any).companyId;
    const invoices = await Invoice.find({
      companyId: clientCompanyId,
      clientId: client._id,
    });

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((inv) =>inv.status === 'paid').length;
    const unpaidInvoices = totalInvoices - paidInvoices;

    // Get expenses
    const expenses = await Expense.find({
      companyId: clientCompanyId,
      clientId: client._id,
    });

    // Get profit data
    const profitData = await ProfitService.calculateClientProfit(clientCompanyId!, client._id);

    res.json({
      success: true,
      data: {
        client,
        summary: {
          totalInvoices,
          paidInvoices,
          unpaidInvoices,
          expenseCount: expenses.length,
          ...profitData,
        },
      },
    });
  } catch (error: any) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch client',
    });
  }
};

/**
 * Update client
 */
export const updateClient = async (req: AuthRequest, res: Response) =>{
  try {
    const name = String(req.body?.name || '').trim();
    const contactPerson = String(req.body?.contactPerson || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const address = String(req.body?.address || '').trim();

    if (!name || !contactPerson || !phone || !email || !address) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields',
      });
    }

    if (!hasMinPhoneDigits(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Phone number must contain at least 10 digits',
      });
    }

    // Company name is allowed to repeat. Only client person name, email, or phone must be unique in a workspace.
    const existingClient = await Client.findOne({
      companyId: req.companyId,
      _id: { $ne: req.params.id },
      $or: [
        { contactPerson: { $regex: new RegExp(`^${escapeRegex(contactPerson)}$`, 'i') } },
        { email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } },
        { phone: phone },
      ],
    });

    if (existingClient) {
      let duplicateField = '';
      if (existingClient.contactPerson.toLowerCase() === contactPerson.toLowerCase()) {
        duplicateField = 'client name';
      } else if (existingClient.email.toLowerCase() === email.toLowerCase()) {
        duplicateField = 'email';
      } else if (existingClient.phone === phone) {
        duplicateField = 'phone';
      }

      return res.status(409).json({
        success: false,
        error: `A client with this ${duplicateField} already exists`,
      });
    }

    const client = await Client.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: req.companyId,
      },
      { name, contactPerson, phone, email, address },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error: any) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update client',
    });
  }
};

/**
 * Delete client
 */
export const deleteClient = async (req: AuthRequest, res: Response) =>{
  try {
    const client = await Client.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found',
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete client',
    });
  }
};
