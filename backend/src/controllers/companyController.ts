import { Request, Response } from 'express';
import { Company, User } from '../models';
import { generateCompanyToken, AuthRequest } from '../middleware/auth';
import { sendWelcomeEmail } from '../utils/emailService';
import { deleteOldLogo } from '../middleware/upload';

/**
 * Generate random strong password
 */
const generatePassword = (): string =>{
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

/**
 * Create a new company account
 */
export const createCompany = async (req: Request, res: Response) =>{
  try {
    const { name, email, address, phone, industry, defaultCurrency, exchangeRateUSD, taxRate } = req.body;

    // Validate required fields
    if (!name || !email || !address || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields: name, email, address, phone',
      });
    }

    // Check for duplicate company name (case-insensitive)
    const existingCompanyByName = await Company.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    if (existingCompanyByName) {
      return res.status(409).json({
        success: false,
        error: 'Company name already exists',
      });
    }

    // Create company
    const company = await Company.create({
      name,
      email,
      address,
      phone,
      industry,
      defaultCurrency: defaultCurrency || 'RWF',
      exchangeRateUSD: exchangeRateUSD || 1300,
      taxRate: taxRate || 18,
    });

    // Generate temporary password for admin
    const temporaryPassword = generatePassword();

    // Create default admin user with temporary password
    // Password will be automatically hashed by the User model's pre-save hook
    const adminUser = await User.create({
      companyId: company._id,
      name: 'Admin',
      email,
      password: temporaryPassword,
      role: 'admin',
    });

    console.log('Admin user created:', {
      id: adminUser._id,
      email: adminUser.email,
      role: adminUser.role,
      companyId: adminUser.companyId,
    });

    // Get the frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendUrl}/company/${company._id}/login`;

    // Send welcome email (don't wait for it to complete)
    sendWelcomeEmail({
      companyName: company.name,
      adminEmail: email,
      loginUrl,
      temporaryPassword,
    }).then((result) =>{
      if (result.success) {
        console.log(`Welcome email queued for ${email}`);
      } else {
        console.error(`Failed to send welcome email: ${result.error}`);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: {
        companyId: company._id,
        companyName: company.name,
        loginUrl,
        adminEmail: email,
        adminTemporaryPassword: temporaryPassword,
      },
    });
  } catch (error: any) {
    console.error('Create company error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create company',
    });
  }
};

/**
 * Get company details
 */
export const getCompany = async (req: AuthRequest, res: Response) =>{
  try {
    const company = await Company.findById(req.companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    res.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    console.error('Get company error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch company',
    });
  }
};

/**
 * Update company details
 */
export const updateCompany = async (req: AuthRequest, res: Response) =>{
  try {
    const {
      name,
      email,
      address,
      phone,
      industry,
      defaultCurrency,
      exchangeRateUSD,
      taxRate,
      logoUrl,
      displayName,
      brandColor,
      brandSecondaryColor,
      invoiceFooterText,
      taxRegistrationNumber,
    } = req.body;

    const company = await Company.findByIdAndUpdate(
      req.companyId,
      {
        name,
        email,
        address,
        phone,
        industry,
        defaultCurrency,
        exchangeRateUSD,
        taxRate,
        logoUrl,
        displayName,
        brandColor,
        brandSecondaryColor,
        invoiceFooterText,
        taxRegistrationNumber,
      },
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  } catch (error: any) {
    console.error('Update company error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update company',
    });
  }
};

/**
 * Delete company and all associated data (Admin only)
 */
export const deleteCompany = async (req: AuthRequest, res: Response) =>{
  try {
    const companyId = req.params.companyId || req.companyId;

    // Check if user is admin (using userRole from AuthRequest)
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only company administrators can delete the company',
      });
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    // Delete all associated data in order
    const { User, Client, Invoice, Expense, File, Notification } = require('../models');

    // 1. Delete all notifications
    await Notification.deleteMany({ companyId });
    console.log(`Deleted notifications for company ${companyId}`);

    // 2. Delete all files
    await File.deleteMany({ companyId });
    console.log(`Deleted files for company ${companyId}`);

    // 3. Delete all expenses
    await Expense.deleteMany({ companyId });
    console.log(`Deleted expenses for company ${companyId}`);

    // 4. Delete all invoices
    await Invoice.deleteMany({ companyId });
    console.log(`Deleted invoices for company ${companyId}`);

    // 5. Delete all clients
    await Client.deleteMany({ companyId });
    console.log(`Deleted clients for company ${companyId}`);

    // 6. Delete all users
    await User.deleteMany({ companyId });
    console.log(`Deleted users for company ${companyId}`);

    // 7. Finally delete the company
    await Company.findByIdAndDelete(companyId);
    console.log(`Deleted company ${companyId}`);

    res.json({
      success: true,
      message: 'Company and all associated data deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete company error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete company',
    });
  }
};


/**
 * Fix company login URL to match current FRONTEND_URL
 * Useful when FRONTEND_URL changes or was incorrect
 */
export const fixCompanyLoginUrl = async (req: AuthRequest, res: Response) =>{
  try {
    const { companyId } = req.params;

    // Check if user is admin
    if (req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only company administrators can fix login URL',
      });
    }

    // Verify company exists
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    // Build new login URL using current FRONTEND_URL
    const frontendUrl = process.env.FRONTEND_URL!;
    const newLoginUrl = `${frontendUrl}/company/${company._id}/login`;

    res.json({
      success: true,
      message: 'Login URL rebuilt successfully',
      data: {
        companyId: company._id,
        companyName: company.name,
        loginUrl: newLoginUrl,
        frontendUrl,
      },
    });
  } catch (error: any) {
    console.error('Fix login URL error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fix login URL',
    });
  }
};

/**
 * Upload company logo
 */
export const uploadCompanyLogo = async (req: AuthRequest, res: Response) =>{
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Find existing company to check for old logo
    const existingCompany = await Company.findById(req.companyId);
    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    // Delete old logo if it exists
    if (existingCompany.logoUrl) {
      deleteOldLogo(existingCompany.logoUrl);
    }

    // Generate logo URL (relative path for company logos)
    const logoUrl = `/uploads/company-logos/${req.file.filename}`;

    // Update company with new logo URL
    const company = await Company.findByIdAndUpdate(
      req.companyId,
      { logoUrl },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logoUrl: company!.logoUrl,
        company,
      },
    });
  } catch (error: any) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload logo',
    });
  }
};

/**
 * Get all companies (for testing/admin purposes only)
 */
export const getAllCompanies = async (req: Request, res: Response) =>{
  try {
    const companies = await Company.find()
      .select('name email phone address industry defaultCurrency createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: companies.length,
      data: companies,
    });
  } catch (error: any) {
    console.error('Get all companies error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch companies',
    });
  }
};
