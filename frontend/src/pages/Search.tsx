import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { formatDateDMY } from '../utils/formatDate';
import { formatCompanyMoney } from '../utils/currency';
import { landingFeatures } from '../data/landingFeatures';

interface SearchClient {
  _id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface SearchInvoice {
  _id: string;
  invoiceNumber?: string;
  clientId?: { _id?: string; name?: string } | string;
  status?: string;
  totalAmount?: number;
  amount?: number;
  dueDate?: string;
}

interface SearchExpense {
  _id: string;
  supplier?: string;
  category?: string;
  description?: string;
  amount?: number;
  currency?: string;
  date?: string;
  paymentStatus?: string;
}

interface SearchNavigationItem {
  id: string;
  title: string;
  description: string;
  category: string;
  path: string;
  keywords: string[];
}

const appNavigationIndex: SearchNavigationItem[] = [
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description: 'Overview of business performance and quick actions.',
    category: 'Workspace',
    path: '/dashboard',
    keywords: ['dashboard', 'home', 'overview', 'workspace'],
  },
  {
    id: 'nav-clients',
    title: 'Clients',
    description: 'Manage clients, contacts, and account history.',
    category: 'CRM',
    path: '/clients',
    keywords: ['clients', 'customers', 'contacts', 'crm'],
  },
  {
    id: 'nav-invoices',
    title: 'Invoices',
    description: 'Create invoices and monitor payment status.',
    category: 'Billing',
    path: '/invoices',
    keywords: ['invoice', 'billing', 'payments', 'receivables'],
  },
  {
    id: 'nav-expenses',
    title: 'Expenses',
    description: 'Track spending, categories, and supplier costs.',
    category: 'Finance',
    path: '/expenses',
    keywords: ['expenses', 'costs', 'spending', 'suppliers'],
  },
  {
    id: 'nav-reports',
    title: 'Reports',
    description: 'Review revenue, costs, and profitability insights.',
    category: 'Analytics',
    path: '/reports',
    keywords: ['reports', 'analytics', 'profit', 'cashflow', 'forecast'],
  },
  {
    id: 'nav-team',
    title: 'Team',
    description: 'Invite and manage teammates and roles.',
    category: 'Administration',
    path: '/team',
    keywords: ['team', 'users', 'members', 'roles', 'permissions'],
  },
  {
    id: 'nav-settings',
    title: 'Settings',
    description: 'Configure company profile, branding, and preferences.',
    category: 'Administration',
    path: '/settings',
    keywords: ['settings', 'configuration', 'company', 'branding', 'profile'],
  },
];

const SearchPage: React.FC = () => {
  const { search } = useLocation();
  const query = (new URLSearchParams(search).get('q') || '').trim().toLowerCase();

  const [clients, setClients] = useState<SearchClient[]>([]);
  const [invoices, setInvoices] = useState<SearchInvoice[]>([]);
  const [expenses, setExpenses] = useState<SearchExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!query) {
        setClients([]);
        setInvoices([]);
        setExpenses([]);
        setError('');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await apiClient.get('/search', {
          params: { q: query, limit: 12 },
        });

        if (cancelled) return;

        const data = response.data?.data || {};
        setClients(Array.isArray(data.clients) ? data.clients : []);
        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
      } catch (fetchError) {
        if (cancelled) return;
        console.error('Search fetch failed:', fetchError);
        setError('Failed to load search data. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const clientResults = useMemo(
    () => clients.slice(0, 12),
    [clients]
  );

  const invoiceResults = useMemo(
    () => invoices.slice(0, 12),
    [invoices]
  );

  const expenseResults = useMemo(
    () => expenses.slice(0, 12),
    [expenses]
  );

  const navigationResults = useMemo(() => {
    if (!query) return [];

    const featurePages: SearchNavigationItem[] = landingFeatures.map((feature) => ({
      id: `feature-${feature.slug}`,
      title: feature.title,
      description: feature.desc,
      category: 'Feature Guide',
      path: `/features/${feature.slug}`,
      keywords: [feature.title, feature.desc, feature.slug, 'feature'],
    }));

    const allNavigationItems = [...appNavigationIndex, ...featurePages];

    return allNavigationItems
      .map((item) => {
        const searchable = `${item.title} ${item.description} ${item.category} ${item.keywords.join(' ')}`.toLowerCase();
        const startsWith = item.title.toLowerCase().startsWith(query);
        const includes = searchable.includes(query);
        if (!startsWith && !includes) return null;
        return { item, score: startsWith ? 2 : 1 };
      })
      .filter((entry): entry is { item: SearchNavigationItem; score: number } => entry !== null)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
      .slice(0, 12)
      .map((entry) => entry.item);
  }, [query]);

  const totalResults = navigationResults.length + clientResults.length + invoiceResults.length + expenseResults.length;

  return (
    <div className="w-full max-w-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
          <Search size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Search</h1>
          <p className="text-sm text-gray-500">{query ? `Results for "${query}"` : 'Type in the top bar to search'}</p>
        </div>
      </div>

      {!query && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Search across pages, features, clients, invoices, and expenses from the navbar.
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Searching records...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && query && !error && totalResults === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          No matches found in pages, features, clients, invoices, or expenses.
        </div>
      )}

      {!loading && totalResults > 0 && (
        <div className="space-y-5">
          {navigationResults.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Pages & Features ({navigationResults.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {navigationResults.map((result) => (
                  <Link key={result.id} to={result.path} className="block px-4 py-3 hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{result.title}</p>
                    <p className="text-sm text-gray-500">
                      {result.category} | {result.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {clientResults.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Clients ({clientResults.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {clientResults.map((client) => (
                  <Link key={client._id} to="/clients" className="block px-4 py-3 hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-500">
                      {client.contactPerson || 'No contact'} {client.email ? `• ${client.email}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {invoiceResults.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Invoices ({invoiceResults.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {invoiceResults.map((invoice) => (
                  <Link key={invoice._id} to={`/invoices/${invoice._id}`} className="block px-4 py-3 hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{invoice.invoiceNumber || `Invoice ${invoice._id}`}</p>
                    <p className="text-sm text-gray-500">
                      {typeof invoice.clientId === 'object' ? invoice.clientId?.name : 'Client unavailable'} •{' '}
                      {invoice.status || 'unknown'} • Due {invoice.dueDate ? formatDateDMY(invoice.dueDate) : 'N/A'}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {expenseResults.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Expenses ({expenseResults.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {expenseResults.map((expense) => (
                  <Link key={expense._id} to={`/expenses/${expense._id}`} className="block px-4 py-3 hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{expense.supplier || 'Unnamed supplier'}</p>
                    <p className="text-sm text-gray-500">
                      {expense.category || 'Uncategorized'} • {formatCompanyMoney(Number(expense.amount || 0), expense.currency || 'RWF')} • {expense.date ? formatDateDMY(expense.date) : 'No date'}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
