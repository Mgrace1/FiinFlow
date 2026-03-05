import { Response } from 'express';
import crypto from 'crypto';
import { User } from '../models';
import Company from '../models/Company';
import { AuthRequest } from '../middleware/auth';
import { sendUserInviteEmail } from '../utils/emailService';
import { isStrongPassword, strongPasswordError } from '../utils/passwordUtils';

/**
 * Create a new user within company
 */
export const createUser = async (req: AuthRequest, res: Response) =>{
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, email, password, and role',
      });
    }

    // Validate password strength
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        error: strongPasswordError,
      });
    }

    // Check if user with this email already exists in this company
    const existingUser = await User.findOne({
      companyId: req.companyId,
      email,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists in your company',
      });
    }

    const user = await User.create({
      companyId: req.companyId,
      name,
      email,
      password,
      phone,
      role,
    });

    // Remove password from response
    const userResponse = user.toObject();
    delete (userResponse as any).password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create user',
    });
  }
};

/**
 * Get all users in company
 */
export const getUsers = async (req: AuthRequest, res: Response) =>{
  try {
    const users = await User.find({ companyId: req.companyId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch users',
    });
  }
};

/**
 * Get single user by ID
 */
export const getUser = async (req: AuthRequest, res: Response) =>{
  try {
    const user = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user',
    });
  }
};

/**
 * Get current logged-in user
 */
export const getCurrentUser = async (req: AuthRequest, res: Response) =>{
  try {
    const user = await User.findById(req.userId)
      .select('-password')
      .populate('companyId', 'name displayName logoUrl brandColor');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update user
 */
export const updateUser = async (req: AuthRequest, res: Response) =>{
  try {
    const { name, email, phone, role, password } = req.body;

    // Load target user first to enforce role-change protections
    const targetUser = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    }).select('role');

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Rule 1: Admin users are immutable via update endpoint
    if (targetUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin users cannot be updated',
      });
    }

    // Rule 2: No user can be promoted to admin via update endpoint
    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Updating a user to admin is not allowed',
      });
    }

    const updateData: any = { name, email, phone, role };

    // Only update password if provided
    if (password) {
      if (!isStrongPassword(password)) {
        return res.status(400).json({
          success: false,
          error: strongPasswordError,
        });
      }
      updateData.password = password;
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, companyId: req.companyId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update user',
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req: AuthRequest, res: Response) =>{
  try {
    const user = await User.findOneAndDelete({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete user',
    });
  }
};

/**
 * Invite a new user to the company
 * POST /api/users/invite
 */
export const inviteUser = async (req: AuthRequest, res: Response) =>{
  try {
    const companyId = req.companyId;
    const invitedByUserId = req.userId;
    const { name, email, role } = req.body;

    // Validate role
    const validRoles = ['admin', 'finance_manager', 'staff'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be one of: admin, finance_manager, staff',
      });
    }

    // Check if user already exists in this company
    const existingUser = await User.findOne({ companyId, email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists in your company',
      });
    }

    // Generate password reset token (used for setting initial password)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Get company details
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        error: 'Company not found',
      });
    }

    // Get inviter details
    const inviter = await User.findById(invitedByUserId);
    if (!inviter) {
      return res.status(404).json({
        success: false,
        error: 'Inviter not found',
      });
    }

    // Create new user with pending status
    const newUser = new User({
      companyId,
      name,
      email,
      role,
      status: 'pending',
      isActive: false,
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpiry,
      invitedBy: invitedByUserId,
      invitedAt: new Date(),
    });

    await newUser.save();

    // Generate invite URL
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/company/${companyId}/set-password?token=${resetToken}`;

    // Send invite email
    await sendUserInviteEmail({
      userName: name,
      userEmail: email,
      companyName: company.name,
      companyLogoUrl: company.logoUrl,
      role,
      inviteUrl,
      invitedByName: inviter.name,
    });

    console.log('User invited successfully');
    console.log(`Email: ${email}`);
    console.log(`Role: ${role}`);
    console.log(`Invited by: ${inviter.name}`);

    res.status(201).json({
      success: true,
      message: 'User invited successfully. Invitation email sent.',
      data: {
        user: {
          _id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          invitedAt: newUser.invitedAt,
        },
      },
    });
  } catch (error: any) {
    console.error('Invite user error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to invite user',
    });
  }
};

/**
 * Resend invitation email
 * POST /api/users/:id/resend-invite
 */
export const resendInvite = async (req: AuthRequest, res: Response) =>{
  try {
    const companyId = req.companyId;
    const userId = req.params.id;
    const invitedByUserId = req.userId;

    const user = await User.findOne({ _id: userId, companyId });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    if (user.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'User is already active. Cannot resend invitation.',
      });
    }

    // Generate new reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // Get company and inviter details
    const company = await Company.findById(companyId);
    const inviter = await User.findById(invitedByUserId);

    if (!company || !inviter) {
      return res.status(404).json({
        success: false,
        error: 'Company or inviter not found',
      });
    }

    // Generate invite URL
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/company/${companyId}/set-password?token=${resetToken}`;

    // Resend invite email
    await sendUserInviteEmail({
      userName: user.name,
      userEmail: user.email,
      companyName: company.name,
      companyLogoUrl: company.logoUrl,
      role: user.role,
      inviteUrl,
      invitedByName: inviter.name,
    });

    res.json({
      success: true,
      message: 'Invitation email resent successfully',
    });
  } catch (error: any) {
    console.error('Resend invite error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resend invitation',
    });
  }
};

/**
 * Change password for logged-in user
 */
export const changePassword = async (req: AuthRequest, res: Response) =>{
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Old and new password required'
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: strongPasswordError
      });
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Set new password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
