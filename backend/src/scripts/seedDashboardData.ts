import path from 'path';
import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';
import { connectDatabase } from '../utils/database';
import { Company, User, Client, Invoice, Expense } from '../models';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SEED_TAG = 'seed-dashboard-v1';

const randomBetween = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const pickOne = <T>(values: readonly T[]): T => {
  return values[Math.floor(Math.random() * values.length)];
};

const startOfMonth = (monthsAgo: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
};

const makeDateInMonth = (monthStart: Date, minDay = 1, maxDay = 25) => {
  const day = randomBetween(minDay, maxDay);
  return new Date(
    monthStart.getFullYear(),
    monthStart.getMonth(),
    Math.min(day, 28),
    randomBetween(8, 17),
    randomBetween(0, 59),
    0,
    0
  );
};

async function ensureClients(companyId: Types.ObjectId) {
  const existing = await Client.find({ companyId }).limit(4);
  if (existing.length >= 4) return existing;

  const baseClients = [
    { name: 'Kigali Safari Tours', contactPerson: 'Eric M.', phone: '0788000001', email: 'ops@kigalisafari.rw', address: 'Kigali, Rwanda' },
    { name: 'Lake View Lodge', contactPerson: 'Grace A.', phone: '0788000002', email: 'finance@lakeview.rw', address: 'Musanze, Rwanda' },
    { name: 'City Shuttle Co', contactPerson: 'Jordan K.', phone: '0788000003', email: 'bookings@cityshuttle.rw', address: 'Kigali, Rwanda' },
    { name: 'Summit Events Ltd', contactPerson: 'Aline T.', phone: '0788000004', email: 'accounts@summitevents.rw', address: 'Kigali, Rwanda' },
  ];

  const toCreate = baseClients.slice(existing.length).map((c) => ({ ...c, companyId }));
  const created = toCreate.length ? await Client.insertMany(toCreate) : [];
  return [...existing, ...created];
}

async function seedDashboardData() {
  await connectDatabase();

  const companyIdArg = process.argv.find((arg) => arg.startsWith('--companyId='))?.split('=')[1];
  const companyEmailArg = process.argv.find((arg) => arg.startsWith('--companyEmail='))?.split('=')[1];

  const company = companyIdArg
    ? await Company.findById(companyIdArg)
    : companyEmailArg
      ? await Company.findOne({ email: companyEmailArg.toLowerCase() })
      : await Company.findOne();

  if (!company) {
    throw new Error('No company found. Pass --companyId=<id> or --companyEmail=<email>.');
  }

  const actor = await User.findOne({ companyId: company._id }).select('_id');
  if (!actor) {
    throw new Error('No user found for selected company. Create a user first.');
  }

  const clients = await ensureClients(company._id as Types.ObjectId);
  const categories = ['Transport', 'Office', 'Marketing', 'Utilities', 'Salaries', 'Other'] as const;

  await Invoice.deleteMany({ companyId: company._id, description: new RegExp(SEED_TAG) });
  await Expense.deleteMany({ companyId: company._id, description: new RegExp(SEED_TAG) });

  const invoiceDocs: any[] = [];
  const expenseDocs: any[] = [];

  for (let m = 5; m >= 0; m--) {
    const monthStart = startOfMonth(m);
    const monthCode = `${monthStart.getFullYear()}${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

    for (let i = 1; i <= 4; i++) {
      const createdAt = makeDateInMonth(monthStart);
      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + randomBetween(7, 21));

      const amount = randomBetween(180000, 1250000);
      const taxRate = 18;
      const taxApplied = true;
      const totalAmount = Math.round(amount + (amount * taxRate) / 100);
      const status = pickOne(['paid', 'sent', 'overdue', 'draft'] as const);

      invoiceDocs.push({
        companyId: company._id,
        clientId: pickOne(clients)._id,
        invoiceNumber: `SD-${monthCode}-${i}-${Date.now().toString().slice(-4)}`,
        invoiceType: 'standard',
        items: [
          {
            name: 'Service package',
            description: `Sample dashboard seed item ${i}`,
            quantity: 1,
            rate: amount,
            amount,
          },
        ],
        amount,
        currency: 'RWF',
        taxApplied,
        taxRate,
        totalAmount,
        status,
        dueDate,
        sentAt: status === 'sent' || status === 'paid' || status === 'overdue' ? createdAt : undefined,
        paidAt: status === 'paid' ? new Date(createdAt.getTime() + randomBetween(2, 10) * 86400000) : undefined,
        description: `${SEED_TAG} - Sample invoice for dashboard chart`,
        notes: 'Seed data for chart visualization',
        createdBy: actor._id,
        createdAt,
        updatedAt: createdAt,
      });
    }

    for (let i = 1; i <= 3; i++) {
      const createdAt = makeDateInMonth(monthStart);
      expenseDocs.push({
        companyId: company._id,
        clientId: pickOne(clients)._id,
        supplier: pickOne(['Fuel Station', 'Office Supplies Co', 'Utility Provider', 'Transport Partner', 'Marketing Agency']),
        category: pickOne(categories),
        amount: randomBetween(50000, 700000),
        currency: 'RWF',
        date: createdAt,
        paymentMethod: pickOne(['Bank', 'Mobile Money']),
        paymentStatus: pickOne(['pending', 'paid']),
        description: `${SEED_TAG} - Sample expense for dashboard chart`,
        createdBy: actor._id,
        createdAt,
        updatedAt: createdAt,
      });
    }
  }

  await Invoice.collection.insertMany(invoiceDocs);
  await Expense.collection.insertMany(expenseDocs);

  console.log(`Seed completed for company: ${company.name}`);
  console.log(`Inserted ${invoiceDocs.length} invoices and ${expenseDocs.length} expenses.`);
  console.log('Refresh dashboard to see cashflow chart populated.');
}

seedDashboardData()
  .catch((error) => {
    console.error('Dashboard seed failed:', error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
