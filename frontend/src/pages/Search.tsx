import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { apiClient } from '../api/client';
import { formatDateDMY } from '../utils/formatDate';
import { formatCompanyMoney } from '../utils/currency';

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

  const totalResults = clientResults.length + invoiceResults.length + expenseResults.length;

  return (
    <div className="max-w-5xl">
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
          Search across clients, invoices, and expenses from the navbar.
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
          No matches found in clients, invoices, or expenses.
        </div>
      )}

      {!loading && totalResults > 0 && (
        <div className="space-y-5">
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
