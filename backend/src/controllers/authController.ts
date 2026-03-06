import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { User } from '../models';
import { sendPasswordResetEmail, sendWelcomeEmail } from '../utils/emailService';
import Company from '../models/Company';
import { AuthRequest } from '../middleware/auth';
import { isStrongPassword, strongPasswordError } from '../utils/passwordUtils';

const generateTemporaryPassword = (): string => {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) =>{
  try {
    const { email, password } = req.body;

    // Validate all required fields
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required',
      });
    }

    // Find user by email, and explicitly select password, role, and companyId
    const user = await User.findOne({ email }).select('+password +role +companyId');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Check if user has a password (should always be present)
    if (!user.password) {
      return res.status(500).json({
        success: false,
        error: 'User account is misconfigured. Please contact support.',
      });
    }

    // Check if user has role and companyId
    if (!user.role || !user.companyId) {
      return res.status(500).json({
        success: false,
        error: 'User account is misconfigured. Missing role or company information.',
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Get company details
    const company = await require('../models').Company.findById(user.companyId);

    // Generate JWT token - validate JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET is not defined in .env file');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error. Please contact support.',
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
        company: {
          id: company?._id,
          name: company?.name,
          logoUrl: company?.logoUrl,
          defaultCurrency: company?.defaultCurrency || 'RWF',
          exchangeRateUSD: Number(company?.exchangeRateUSD || 1300),
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
};

/**
 * Get all companies available for the currently logged-in email.
 * GET /api/auth/workspaces
 */
export const getMyWorkspaces = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const currentUser = await User.findById(req.userId).select('email');
    if (!currentUser?.email) {
      return res.status(404).json({
        success: false,
        error: 'Current user not found',
      });
    }

    const usersWithSameEmail = await User.find({
      email: currentUser.email.toLowerCase(),
      isActive: true,
    })
      .select('_id name email role companyId')
      .populate('companyId', 'name email logoUrl displayName');

    const data = usersWithSameEmail
      .filter((u: any) => u.companyId)
      .map((u: any) => ({
        userId: u._id,
        userName: u.name,
        role: u.role,
        companyId: u.companyId._id,
        companyName: u.companyId.displayName || u.companyId.name,
        companyEmail: u.companyId.email,
        logoUrl: u.companyId.logoUrl || '',
      }));

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Get workspaces error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to load workspaces',
    });
  }
};

/**
 * Switch active workspace for current email.
 * POST /api/auth/switch-workspace
 */
export const switchWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'companyId is required',
      });
    }

    const currentUser = await User.findById(req.userId).select('email');
    if (!currentUser?.email) {
      return res.status(404).json({
        success: false,
        error: 'Current user not found',
      });
    }

    const targetUser = await User.findOne({
      email: currentUser.email.toLowerCase(),
      companyId: new Types.ObjectId(String(companyId)),
      isActive: true,
    }).select('_id name email role companyId');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found for this email',
      });
    }

    const company = await Company.findById(targetUser.companyId).select('_id name logoUrl defaultCurrency exchangeRateUSD');
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    const token = jwt.sign(
      {
        userId: targetUser._id,
        companyId: targetUser.companyId,
        email: targetUser.email,
        role: targetUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Workspace switched successfully',
      data: {
        token,
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          companyId: targetUser.companyId,
        },
        company: {
          id: company._id,
          name: company.name,
          logoUrl: company.logoUrl,
          defaultCurrency: company.defaultCurrency || 'RWF',
          exchangeRateUSD: Number(company.exchangeRateUSD || 1300),
        },
      },
    });
  } catch (error: any) {
    console.error('Switch workspace error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to switch workspace',
    });
  }
};

/**
 * Create an additional workspace (company) for the currently logged-in email.
 * POST /api/auth/workspaces
 */
export const createWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (req.userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can create a new workspace',
      });
    }

    const {
      name,
      email,
      address,
      phone,
      industry,
      defaultCurrency,
      exchangeRateUSD,
      taxRate,
    } = req.body || {};

    if (!name || !address || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide required fields: name, address, phone',
      });
    }

    const currentUser = await User.findById(req.userId).select('name email');
    if (!currentUser?.email) {
      return res.status(404).json({
        success: false,
        error: 'Current user not found',
      });
    }

    const existingCompanyByName = await Company.findOne({
      name: { $regex: new RegExp(`^${String(name).trim()}$`, 'i') },
    });
    if (existingCompanyByName) {
      return res.status(409).json({
        success: false,
        error: 'Company name already exists',
      });
    }

    const companyEmail = String(email || currentUser.email).trim().toLowerCase();
    const companyData = {
      name: String(name).trim(),
      email: companyEmail,
      address: String(address).trim(),
      phone: String(phone).trim(),
      industry: String(industry || '').trim(),
      defaultCurrency: defaultCurrency || 'RWF',
      exchangeRateUSD: Number(exchangeRateUSD || 1300),
      taxRate: Number(taxRate || 18),
    };

    let company: any;
    try {
      company = await Company.create(companyData);
    } catch (error: any) {
      if (error?.code === 11000 && error?.keyPattern?.email) {
        try {
          await Company.collection.dropIndex('email_1');
          company = await Company.create(companyData);
        } catch (retryError: any) {
          return res.status(409).json({
            success: false,
            error: retryError?.message || 'Company email conflict while creating workspace',
          });
        }
      } else {
        throw error;
      }
    }

    const temporaryPassword = generateTemporaryPassword();
    const adminUser = await User.create({
      companyId: company._id,
      name: currentUser.name || 'Admin',
      email: currentUser.email.toLowerCase(),
      password: temporaryPassword,
      role: 'admin',
      status: 'active',
      isActive: true,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendUrl}/company/${company._id}/login`;

    // Fire-and-forget welcome email for new workspace admin credentials.
    sendWelcomeEmail({
      companyName: company.name,
      adminEmail: currentUser.email.toLowerCase(),
      loginUrl,
      temporaryPassword,
    }).then((result) =>{
      if (!result.success) {
        console.error(`Failed to send workspace welcome email: ${result.error}`);
      }
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: {
        companyId: company._id,
        companyName: company.name,
        userId: adminUser._id,
        loginUrl,
      },
    });
  } catch (error: any) {
    console.error('Create workspace error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create workspace',
    });
  }
};

/**
 * Set password for invited user
 * POST /api/auth/set-password
 */
export const setPassword = async (req: Request, res: Response) =>{
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and password are required',
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: strongPasswordError,
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Set password and activate user
    user.password = password;
    user.status = 'active';
    user.isActive = true;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log('Password set successfully');
    console.log(`User: ${user.email}`);
    console.log(`Status: ${user.status}`);

    res.json({
      success: true,
      message: 'Password set successfully. You can now log in.',
    });
  } catch (error: any) {
    console.error('Set password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set password',
    });
  }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response) =>{
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required',
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if user not found (security best practice)
      return res.json({
        success: true,
        message: 'If an account exists, a password reset email has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // Get company details
    const company = await Company.findById(user.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    // Generate reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    // Send reset email
    await sendPasswordResetEmail({
      userName: user.name,
      userEmail: user.email,
      resetUrl,
      companyName: company.name,
    });

    console.log('Password reset email sent');
    console.log(`To: ${user.email}`);

    res.json({
      success: true,
      message: 'If an account exists, a password reset email has been sent.',
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process password reset request',
    });
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req: Request, res: Response) =>{
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and password are required',
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: strongPasswordError,
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log('Password reset successfully');
    console.log(`User: ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset password',
    });
  }
};
