import { Request, Response } from 'express';
import { Company, User } from '../models';
import { generateCompanyToken, AuthRequest } from '../middleware/auth';
import { sendWelcomeEmail } from '../utils/emailService';
import { isStrongPassword, strongPasswordError } from '../utils/passwordUtils';
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

export const deleteCompanyWithDependencies = async (targetCompanyId: string): Promise<void> => {
  // Verify company exists
  const company = await Company.findById(targetCompanyId);
  if (!company) {
    throw new Error('Company not found');
  }

  // Delete all associated data in order
  const { Client, Invoice, Expense, File, Notification } = require('../models');

  await Notification.deleteMany({ companyId: targetCompanyId });
  await File.deleteMany({ companyId: targetCompanyId });
  await Expense.deleteMany({ companyId: targetCompanyId });
  await Invoice.deleteMany({ companyId: targetCompanyId });
  await Client.deleteMany({ companyId: targetCompanyId });
  await User.deleteMany({ companyId: targetCompanyId });
  await Company.findByIdAndDelete(targetCompanyId);
};

/**
 * Create a new company account
 */
export const createCompany = async (req: Request, res: Response) =>{
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
      password,
    } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const providedPassword = String(password || '').trim();

    // Validate required fields
    if (!name || !email || !address || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide all required fields: name, email, address, phone',
      });
    }

    if (providedPassword && !isStrongPassword(providedPassword)) {
      return res.status(400).json({
        success: false,
        error: strongPasswordError,
      });
    }

    // Public self-registration rule:
    // If this email already has an account anywhere, block registration.
    // (Workspace creation for same email is handled by /api/auth/workspaces and remains allowed.)
    const existingUserWithEmail = await User.findOne({ email: normalizedEmail }).select('_id');
    if (existingUserWithEmail) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please log in instead.',
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
      email: normalizedEmail,
      address,
      phone,
      industry,
      defaultCurrency: defaultCurrency || 'RWF',
      exchangeRateUSD: exchangeRateUSD || 1300,
      taxRate: taxRate || 18,
    });

    const hasProvidedPassword = Boolean(providedPassword);
    const temporaryPassword = hasProvidedPassword ? undefined : generatePassword();
    const adminPassword = hasProvidedPassword ? providedPassword : temporaryPassword!;

    // Create default admin user with temporary password
    // Password will be automatically hashed by the User model's pre-save hook
    const adminUser = await User.create({
      companyId: company._id,
      name: 'Admin',
      email: normalizedEmail,
      password: adminPassword,
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
        adminEmail: normalizedEmail,
        ...(temporaryPassword ? { adminTemporaryPassword: temporaryPassword } : { passwordSet: true }),
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
      invoicePrefix,
      defaultPaymentInstructions,
      taxRegistrationNumber,
    } = req.body;

    const updatePayload: Record<string, any> = {};
    const assignIfDefined = (key: string, value: any) => {
      if (value !== undefined) updatePayload[key] = value;
    };

    assignIfDefined('name', name);
    assignIfDefined('email', email);
    assignIfDefined('address', address);
    assignIfDefined('phone', phone);
    assignIfDefined('industry', industry);
    assignIfDefined('defaultCurrency', defaultCurrency);
    assignIfDefined('exchangeRateUSD', exchangeRateUSD);
    assignIfDefined('taxRate', taxRate);
    assignIfDefined('logoUrl', logoUrl);
    assignIfDefined('displayName', displayName);
    assignIfDefined('brandColor', brandColor);
    assignIfDefined('brandSecondaryColor', brandSecondaryColor);
    assignIfDefined('invoiceFooterText', invoiceFooterText);
    assignIfDefined('invoicePrefix', invoicePrefix);
    assignIfDefined('defaultPaymentInstructions', defaultPaymentInstructions);
    assignIfDefined('taxRegistrationNumber', taxRegistrationNumber);

    const company = await Company.findByIdAndUpdate(
      req.companyId,
      updatePayload,
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
    const activeCompanyId = String(req.companyId || '');
    const targetCompanyId = String(companyId || '');

    if (!targetCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'Target workspace is required',
      });
    }

    // Safety: current active workspace cannot be deleted
    if (activeCompanyId === targetCompanyId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete the current active workspace',
      });
    }

    // Check if user is admin (using userRole from AuthRequest)
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only company administrators can delete the company',
      });
    }

    // Security: when deleting another workspace, normal admins must also be admins in target workspace.
    // Super admins can delete any workspace.
    if (req.userRole !== 'super_admin') {
      const currentUser = req.userId ? await User.findById(req.userId).select('email') : null;
      const currentEmail = String(currentUser?.email || '').trim().toLowerCase();
      if (!currentEmail) {
        return res.status(403).json({
          success: false,
          error: 'Unable to verify workspace admin access',
        });
      }

      const adminInTarget = await User.findOne({
        companyId: targetCompanyId,
        email: currentEmail,
        role: 'admin',
      }).select('_id');

      if (!adminInTarget) {
        return res.status(403).json({
          success: false,
          error: 'You are not an admin of the selected workspace',
        });
      }
    }

    await deleteCompanyWithDependencies(targetCompanyId);

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
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
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
