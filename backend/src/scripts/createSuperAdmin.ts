import dotenv from 'dotenv';
import path from 'path';
import { Types } from 'mongoose';
import { connectDatabase } from '../utils/database';
import { Company, User } from '../models';
import { isStrongPassword, strongPasswordError } from '../utils/passwordUtils';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const run = async () => {
  await connectDatabase();

  const email = String(process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.SUPER_ADMIN_PASSWORD || '').trim();
  const name = String(process.env.SUPER_ADMIN_NAME || 'Platform Super Admin').trim();
  const preferredCompanyId = String(process.env.SUPER_ADMIN_COMPANY_ID || '').trim();

  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required in backend/.env');
  }
  if (!isStrongPassword(password)) {
    throw new Error(strongPasswordError);
  }

  let companyId: Types.ObjectId | null = null;
  if (preferredCompanyId && Types.ObjectId.isValid(preferredCompanyId)) {
    const company = await Company.findById(preferredCompanyId).select('_id');
    if (company) companyId = new Types.ObjectId(String(company._id));
  }

  if (!companyId) {
    const fallbackCompany = await Company.findOne().sort({ createdAt: 1 }).select('_id');
    if (!fallbackCompany) {
      throw new Error('No company found. Create at least one company before creating a super admin.');
    }
    companyId = new Types.ObjectId(String(fallbackCompany._id));
  }

  const existing = await User.findOne({ email, role: 'super_admin' }).select('_id');
  if (existing) {
    console.log(`Super admin already exists for ${email}`);
    process.exit(0);
  }

  const user = await User.create({
    companyId,
    name,
    email,
    password,
    role: 'super_admin',
    status: 'active',
    isActive: true,
  });

  console.log(`Super admin created successfully: ${user.email} (${user._id})`);
  process.exit(0);
};

run().catch((error) => {
  console.error(`Failed to create super admin: ${error.message}`);
  process.exit(1);
});
