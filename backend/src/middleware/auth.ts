import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface AuthRequest extends Request {
  companyId?: Types.ObjectId;
  userId?: Types.ObjectId;
  userRole?: string;
  isSuperAdmin?: boolean;
}

// Middleware to verify company access token
export const verifyCompanyAccess = (req: AuthRequest, res: Response, next: NextFunction) =>{
  try {
    const authHeader = req.headers.authorization;

    console.log('Auth Middleware - Verifying token');
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('ERROR: No Bearer token in header');
      return res.status(401).json({
        success: false,
        error: 'No access token provided',
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted:', token ? `${token.substring(0, 20)}...`: 'Missing');

    if (!token) {
      console.log('ERROR: Token is empty');
      return res.status(401).json({
        success: false,
        error: 'No access token provided',
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be defined in .env file');
    }
    const secret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret) as any;

    console.log('SUCCESS: Token verified successfully');
    console.log('CompanyId:', decoded.companyId);
    console.log('UserId:', decoded.userId);
    console.log('Role:', decoded.role);

    req.companyId = new Types.ObjectId(decoded.companyId);
    req.userId = decoded.userId ? new Types.ObjectId(decoded.userId) : undefined;
    req.userRole = decoded.role;
    req.isSuperAdmin = decoded.role === 'super_admin';

    next();
  } catch (error: any) {
    console.log('ERROR: Token verification failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

// Middleware to check if user has admin role
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) =>{
  if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
  }
  next();
};

// Middleware to check if user has admin or finance_manager role
export const requireFinanceAccess = (req: AuthRequest, res: Response, next: NextFunction) =>{
  if (req.userRole !== 'admin' && req.userRole !== 'finance_manager' && req.userRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Finance Manager or Admin access required',
    });
  }
  next();
};

// Middleware to check if user has at least staff role (all authenticated users)
export const requireStaffAccess = (req: AuthRequest, res: Response, next: NextFunction) =>{
  if (!req.userRole) {
    return res.status(403).json({
      success: false,
      error: 'Authentication required',
    });
  }
  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.userRole !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Super admin access required',
    });
  }
  next();
};

// Middleware for draft-only access (staff can only create/edit drafts)
export const requireDraftAccess = (req: AuthRequest, res: Response, next: NextFunction) =>{
  if (req.userRole === 'super_admin') {
    return next();
  }
  // Staff can only work with drafts
  if (req.userRole === 'staff') {
    const status = req.body.status || req.query.status;
    if (status && status !== 'draft') {
      return res.status(403).json({
        success: false,
        error: 'Staff users can only create and edit draft invoices',
      });
    }
  }
  next();
};

// Generate company access token
export const generateCompanyToken = (companyId: string, userId?: string, role?: string): string =>{
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be defined in .env file');
  }
  const secret = process.env.JWT_SECRET;
  const payload: any = { companyId };

  if (userId) payload.userId = userId;
  if (role) payload.role = role;

  return jwt.sign(payload, secret, { expiresIn: '30d' });
};
