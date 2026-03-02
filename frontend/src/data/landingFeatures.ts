export interface LandingFeature {
  slug: string;
  title: string;
  desc: string;
  image: string;
  overview: string;
  highlights: string[];
}

export const landingFeatures: LandingFeature[] = [
  {
    slug: 'professional-invoicing',
    title: 'Professional invoicing',
    desc: 'Create clean invoices with line items, tax calculation, and payment tracking. Send directly to clients.',
    image: '/landing/invoice.png',
    overview:
      'Build consistent invoices with structured line items, invoice types, tax handling, and controlled status updates from draft to paid.',
    highlights: [
      'Custom invoice numbering and invoice type support',
      'Line-item based totals with optional tax calculations',
      'Status lifecycle: draft, sent, paid, overdue, cancelled',
      'Attachment support for invoice files and payment receipts',
    ],
  },
  {
    slug: 'expense-tracking',
    title: 'Expense tracking',
    desc: 'Record business expenses, upload receipt photos, and know exactly where your money goes.',
    image: '/landing/expense.png',
    overview:
      'Capture each expense with supplier, category, due date, payment method, and paid amount so you can track balances and obligations in real time.',
    highlights: [
      'Expense categorization for cleaner reporting',
      'Remaining balance visibility per expense',
      'Due date tracking and pending payment alerts',
      'Integrated payment flow hooks for settlement',
    ],
  },
  {
    slug: 'client-management',
    title: 'Client management',
    desc: 'Keep client contacts, transaction history, and payment records organized in one place.',
    image: '/landing/client.png',
    overview:
      'Store each client profile once and connect invoices and expenses to that record for a complete financial relationship timeline.',
    highlights: [
      'Client profile with contact and business details',
      'Linked invoices and expenses by client',
      'Client-level financial summary views',
      'Faster lookup through centralized records',
    ],
  },
  {
    slug: 'cash-flow-forecasting',
    title: 'Cash flow forecasting',
    desc: 'See your expected cash position for the next 90 days based on your actual data.',
    image: '/landing/cashflow.png',
    overview:
      'Use historical paid invoices and expenses to generate a forward-looking cash-flow forecast and reduce uncertainty in short-term planning.',
    highlights: [
      '90-day projected cash-flow timeline',
      'Built from your live transaction history',
      'Helpful for planning outgoing payments',
      'Complements month-by-month reporting',
    ],
  },
  {
    slug: 'payment-receipts',
    title: 'Payment receipts',
    desc: 'Upload proof of payment, view receipts inline, and download in original format.',
    image: '/landing/aplliance.png',
    overview:
      'Attach payment evidence directly to invoices and keep an auditable trail before marking invoices as paid.',
    highlights: [
      'Upload PDF and image receipt formats',
      'Inline preview and original-file download',
      'Role-aware actions for deletion/management',
      'Receipt-required paid status workflows',
    ],
  },
  {
    slug: 'financial-reports',
    title: 'Financial reports',
    desc: 'Understand revenue, expenses, and profit with clear dashboards and exportable PDFs.',
    image: '/landing/finreport.png',
    overview:
      'Track financial performance with clear summaries, trends, category breakdowns, and exportable outputs for stakeholders.',
    highlights: [
      'Revenue, expense, and profit summaries',
      'Net cashflow and category visualizations',
      'Client performance insights',
      'PDF and CSV export options',
    ],
  },
];
