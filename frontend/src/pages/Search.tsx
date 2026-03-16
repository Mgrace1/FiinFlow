import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { formatDateDMY } from '../utils/formatDate';
import { formatCompanyMoney } from '../utils/currency';
import { useLanguage } from '../contexts/LanguageContext';

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

const SearchPage: React.FC = () => {
  const { search } = useLocation();
  const { t } = useLanguage();
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
        setError('search_error');
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

  const appNavigationIndex: SearchNavigationItem[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      title: t('nav.dashboard'),
      description: t('search.nav_dashboard_desc'),
      category: t('search.nav_workspace'),
      path: '/dashboard',
      keywords: ['dashboard', 'home', 'overview', 'workspace', 'tableau de bord', 'accueil', 'aperçu', 'espace de travail'],
    },
    {
      id: 'nav-clients',
      title: t('nav.clients'),
      description: t('search.nav_clients_desc'),
      category: t('search.nav_crm'),
      path: '/clients',
      keywords: ['clients', 'customers', 'contacts', 'crm', 'clients', 'contacts', 'crm'],
    },
    {
      id: 'nav-invoices',
      title: t('nav.invoices'),
      description: t('search.nav_invoices_desc'),
      category: t('search.nav_billing'),
      path: '/invoices',
      keywords: ['invoice', 'billing', 'payments', 'receivables', 'factures', 'facturation', 'paiements'],
    },
    {
      id: 'nav-expenses',
      title: t('nav.expenses'),
      description: t('search.nav_expenses_desc'),
      category: t('search.nav_finance'),
      path: '/expenses',
      keywords: ['expenses', 'costs', 'spending', 'suppliers', 'dépenses', 'coûts', 'fournisseurs'],
    },
    {
      id: 'nav-reports',
      title: t('nav.reports'),
      description: t('search.nav_reports_desc'),
      category: t('search.nav_analytics'),
      path: '/reports',
      keywords: ['reports', 'analytics', 'profit', 'cashflow', 'forecast', 'rapports', 'analytique', 'profit', 'trésorerie'],
    },
    {
      id: 'nav-team',
      title: t('nav.team'),
      description: t('search.nav_team_desc'),
      category: t('search.nav_admin'),
      path: '/team',
      keywords: ['team', 'users', 'members', 'roles', 'permissions', 'équipe', 'utilisateurs', 'rôles', 'permissions'],
    },
    {
      id: 'nav-settings',
      title: t('nav.settings'),
      description: t('search.nav_settings_desc'),
      category: t('search.nav_admin'),
      path: '/settings',
      keywords: ['settings', 'configuration', 'company', 'branding', 'profile', 'paramètres', 'configuration', 'entreprise', 'profil'],
    },
  ], [t]);

  const navigationResults = useMemo(() => {
    if (!query) return [];

    return appNavigationIndex
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
  }, [query, appNavigationIndex]);

  const totalResults = navigationResults.length + clientResults.length + invoiceResults.length + expenseResults.length;

  return (
    <div className="w-full max-w-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-blue-100 p-2 text-blue-700">
          <Search size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{t('search.title')}</h1>
          <p className="text-sm text-gray-500">{query ? `${t('search.results_for')} "${query}"` : t('search.type_hint')}</p>
        </div>
      </div>

      {!query && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          {t('search.helper')}
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          {t('search.loading')}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {t('search.error')}
        </div>
      )}

      {!loading && query && !error && totalResults === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
          {t('search.no_matches')}
        </div>
      )}

      {!loading && totalResults > 0 && (
        <div className="space-y-5">
          {navigationResults.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">{t('search.pages')} ({navigationResults.length})</h2>
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
                <h2 className="text-sm font-semibold text-gray-900">{t('search.clients')} ({clientResults.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {clientResults.map((client) => (
                  <Link key={client._id} to="/clients" className="block px-4 py-3 hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-sm text-gray-500">
                      {client.contactPerson || t('search.no_contact')} {client.email ? `• ${client.email}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {invoiceResults.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">{t('search.invoices')} ({invoiceResults.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {invoiceResults.map((invoice) => (
                  <Link key={invoice._id} to={`/invoices/${invoice._id}`} className="block px-4 py-3 hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{invoice.invoiceNumber || `Invoice ${invoice._id}`}</p>
                    <p className="text-sm text-gray-500">
                      {typeof invoice.clientId === 'object' ? invoice.clientId?.name : t('search.client_unavailable')} •{' '}
                      {(invoice.status === 'sent' ? 'pending' : invoice.status) || 'unknown'} • {t('search.due')} {invoice.dueDate ? formatDateDMY(invoice.dueDate) : 'N/A'}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {expenseResults.length > 0 && (
            <section className="rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">{t('search.expenses')} ({expenseResults.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {expenseResults.map((expense) => (
                  <Link key={expense._id} to="/expenses" className="block px-4 py-3 hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{expense.supplier || t('search.unnamed_supplier')}</p>
                    <p className="text-sm text-gray-500">
                      {expense.category || t('search.uncategorized')} • {formatCompanyMoney(Number(expense.amount || 0), expense.currency || 'RWF')} • {expense.paymentStatus || 'unknown'} • {expense.date ? formatDateDMY(expense.date) : 'No date'}
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


