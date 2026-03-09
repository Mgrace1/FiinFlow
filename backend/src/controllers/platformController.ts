import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Company, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { deleteCompanyWithDependencies } from './companyController';
import { isStrongPassword, strongPasswordError } from '../utils/passwordUtils';

const generatePassword = (): string => {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
};

export const listCompanies = async (_req: Request, res: Response) => {
  try {
    const companies = await Company.find().sort({ createdAt: -1 });
    res.json({ success: true, data: companies });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch companies' });
  }
};

export const getCompanyById = async (req: Request, res: Response) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const usersCount = await User.countDocuments({ companyId: company._id });
    res.json({ success: true, data: { ...company.toObject(), usersCount } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch company' });
  }
};

export const createCompanyGlobal = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, address, phone, industry, defaultCurrency, exchangeRateUSD, taxRate, adminName, adminEmail, adminPassword } = req.body || {};

    if (!name || !email || !address || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide required fields: name, email, address, phone',
      });
    }

    const normalizedCompanyEmail = String(email).trim().toLowerCase();
    const existingByName = await Company.findOne({ name: { $regex: new RegExp(`^${String(name).trim()}$`, 'i') } });
    if (existingByName) {
      return res.status(409).json({ success: false, error: 'Company name already exists' });
    }

    const company = await Company.create({
      name: String(name).trim(),
      email: normalizedCompanyEmail,
      address: String(address).trim(),
      phone: String(phone).trim(),
      industry: String(industry || '').trim(),
      defaultCurrency: defaultCurrency || 'RWF',
      exchangeRateUSD: Number(exchangeRateUSD || 1300),
      taxRate: Number(taxRate || 18),
    });

    const finalAdminEmail = String(adminEmail || normalizedCompanyEmail).trim().toLowerCase();
    const finalAdminName = String(adminName || 'Admin').trim();
    const finalPassword = String(adminPassword || generatePassword());
    if (!isStrongPassword(finalPassword)) {
      return res.status(400).json({ success: false, error: strongPasswordError });
    }

    const adminUser = await User.create({
      companyId: company._id,
      name: finalAdminName,
      email: finalAdminEmail,
      password: finalPassword,
      role: 'admin',
      isActive: true,
      status: 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: {
        company,
        admin: {
          _id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
          companyId: adminUser.companyId,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create company' });
  }
};

export const updateCompanyGlobal = async (req: Request, res: Response) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.companyId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    res.json({ success: true, message: 'Company updated successfully', data: company });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update company' });
  }
};

export const deleteCompanyGlobal = async (req: AuthRequest, res: Response) => {
  try {
    const targetCompanyId = String(req.params.companyId || '').trim();
    if (!targetCompanyId) {
      return res.status(400).json({ success: false, error: 'Company ID is required' });
    }

    // Safety: prevent deleting active workspace that holds the current token context.
    if (String(req.companyId || '') === targetCompanyId) {
      return res.status(400).json({ success: false, error: 'Switch workspace before deleting the current active workspace' });
    }

    await deleteCompanyWithDependencies(targetCompanyId);
    res.json({ success: true, message: 'Company and associated data deleted successfully' });
  } catch (error: any) {
    const status = error?.message === 'Company not found' ? 404 : 500;
    res.status(status).json({ success: false, error: error.message || 'Failed to delete company' });
  }
};

export const listUsersGlobal = async (_req: Request, res: Response) => {
  try {
    const users = await User.find()
      .select('-password -passwordResetToken -passwordResetExpires')
      .populate('companyId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch users' });
  }
};

export const createUserGlobal = async (req: AuthRequest, res: Response) => {
  try {
    const { companyId, name, email, password, phone, role } = req.body || {};
    if (!companyId || !name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Please provide companyId, name, email, password and role',
      });
    }

    if (!Types.ObjectId.isValid(String(companyId))) {
      return res.status(400).json({ success: false, error: 'Invalid companyId' });
    }

    if (!isStrongPassword(String(password))) {
      return res.status(400).json({ success: false, error: strongPasswordError });
    }

    const validRoles = ['super_admin', 'admin', 'finance_manager', 'staff'];
    if (!validRoles.includes(String(role))) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const company = await Company.findById(companyId).select('_id');
    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    const existing = await User.findOne({
      companyId: new Types.ObjectId(String(companyId)),
      email: String(email).trim().toLowerCase(),
    }).select('_id');
    if (existing) {
      return res.status(409).json({ success: false, error: 'User already exists in this company' });
    }

    const user = await User.create({
      companyId,
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: String(password),
      phone: String(phone || '').trim() || undefined,
      role: String(role),
      status: 'active',
      isActive: true,
    });

    const safeUser = user.toObject();
    delete (safeUser as any).password;
    res.status(201).json({ success: true, message: 'User created successfully', data: safeUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to create user' });
  }
};

export const updateUserGlobal = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, role, password, isActive, status } = req.body || {};
    const targetUser = await User.findById(req.params.userId).select('_id role');
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = String(name).trim();
    if (email !== undefined) updateData.email = String(email).trim().toLowerCase();
    if (phone !== undefined) updateData.phone = String(phone).trim();
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (status !== undefined) updateData.status = status;

    if (role !== undefined) {
      const validRoles = ['super_admin', 'admin', 'finance_manager', 'staff'];
      if (!validRoles.includes(String(role))) {
        return res.status(400).json({ success: false, error: 'Invalid role' });
      }
      updateData.role = role;
    }

    if (password !== undefined && String(password).trim()) {
      if (!isStrongPassword(String(password))) {
        return res.status(400).json({ success: false, error: strongPasswordError });
      }
      updateData.password = String(password);
    }

    const user = await User.findByIdAndUpdate(req.params.userId, updateData, { new: true, runValidators: true })
      .select('-password -passwordResetToken -passwordResetExpires');
    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update user' });
  }
};

export const deleteUserGlobal = async (req: AuthRequest, res: Response) => {
  try {
    if (String(req.userId || '') === String(req.params.userId || '')) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own super admin account',
      });
    }

    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to delete user' });
  }
};
