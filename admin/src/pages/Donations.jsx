import React, { useState, useEffect } from 'react';
import { Heart, Search, Download, Trash2, Users, IndianRupee, Calendar, CheckCircle2, FileText, Sparkles, Filter } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAdminStore } from '../store/useAdminStore';

export default function Donations() {
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | '7days' | 'month' | 'fy'
  const [filter80G, setFilter80G] = useState('all'); // 'all' | '80g_only' | 'standard_only'
  
  const token = useAdminStore((state) => state.token);
  const pinHash = useAdminStore((state) => state.pinHash);

  const getHeaders = () => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (pinHash) headers['x-cms-pin-hash'] = pinHash;
    return headers;
  };

  const fetchDonations = async () => {
    try {
      const res = await fetch('/api/donations', { headers: getHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.donations)) {
        setDonations(data.donations);
      }
    } catch (err) {
      console.error('Failed to load donations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/donations/stats', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  useEffect(() => {
    fetchDonations();
    fetchStats();
  }, [pinHash, token]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donor record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/donations/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDonations((prev) => prev.filter((item) => item.id !== id));
        fetchStats();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredDonations = () => {
    const now = new Date();
    return donations.filter((item) => {
      const itemDate = new Date(item.date);

      // Date Range Filter
      if (dateFilter === 'today') {
        const isToday = itemDate.toDateString() === now.toDateString();
        if (!isToday) return false;
      } else if (dateFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (itemDate < sevenDaysAgo) return false;
      } else if (dateFilter === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (itemDate < startOfMonth) return false;
      } else if (dateFilter === 'fy') {
        // Indian Financial Year: April 1 to March 31
        const currentYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        const fyStart = new Date(currentYear, 3, 1);
        const fyEnd = new Date(currentYear + 1, 2, 31, 23, 59, 59);
        if (itemDate < fyStart || itemDate > fyEnd) return false;
      }

      // 80G Filter
      if (filter80G === '80g_only' && !item.claim80g) return false;
      if (filter80G === 'standard_only' && item.claim80g) return false;

      // Tab Filters
      const hasEmail = Boolean(item.email && item.email.trim() && item.email.includes('@'));
      if (activeTab === 'no_email' && hasEmail) return false;
      if (activeTab === 'with_email' && !hasEmail) return false;
      if (activeTab === 'monthly' && item.frequency !== 'monthly') return false;
      if (activeTab !== 'all' && activeTab !== 'no_email' && activeTab !== 'with_email' && activeTab !== 'monthly' && (item.purpose || '').toLowerCase() !== activeTab.toLowerCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase();
        return (
          (item.name || '').toLowerCase().includes(search) ||
          (item.email && item.email.toLowerCase().includes(search)) ||
          (item.phone && item.phone.toLowerCase().includes(search)) ||
          (item.panNumber && item.panNumber.toLowerCase().includes(search)) ||
          (item.transactionRef && item.transactionRef.toLowerCase().includes(search)) ||
          (item.purpose || '').toLowerCase().includes(search) ||
          String(item.amount).includes(search)
        );
      }

      return true;
    });
  };

  const filtered = getFilteredDonations();
  const totalAmount = donations.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const count80g = donations.filter(d => d.claim80g).length;
  const noEmailDonorsCount = donations.filter(d => !d.email || !d.email.includes('@')).length;
  const withEmailDonorsCount = donations.filter(d => d.email && d.email.includes('@')).length;
  const monthlyCount = donations.filter(d => d.frequency === 'monthly').length;

  const exportToCSV = () => {
    if (filtered.length === 0) {
      alert('No donation records to export.');
      return;
    }

    const headers = ['Transaction Ref', 'Receipt Number', 'Donor Name', 'Donor PAN (80G)', 'Email Address', 'Mobile Phone', 'Full Postal Address', 'Purpose / Cause', 'Frequency', 'Amount (INR)', 'Date & Time', 'Status'];
    const rows = filtered.map((d) => [
      d.transactionRef || d.id,
      d.receiptNumber || 'N/A',
      d.name,
      d.panNumber || (d.claim80g ? 'Claimed - No PAN' : 'Non-80G'),
      d.email || 'N/A',
      d.phone || 'N/A',
      d.address ? `"${d.address.replace(/"/g, '""')}"` : 'N/A',
      d.purpose,
      d.frequency === 'monthly' ? 'Monthly Sponsorship' : 'One-Time',
      d.amount,
      new Date(d.date).toLocaleString('en-IN'),
      d.status || 'SUCCESS'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Lakshya_Donations_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniquePurposes = Array.from(new Set(donations.map((d) => d.purpose).filter(Boolean)));

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Donations & 80G Receipts"
        description="Review all verified contributions, monitor financial growth, and download official 80G tax exemption receipts."
        actions={
          <button
            onClick={exportToCSV}
            className="admin-btn-secondary flex items-center gap-2 py-2 px-3 text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV (Form 10BD)</span>
          </button>
        }
      />

      {/* KPI Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Verified Funds */}
        <div className="p-5 rounded-2xl bg-admin-surface border border-admin-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-admin-muted">
              Total Funds Raised
            </span>
            <div className="p-2 rounded-xl bg-forest-500/10 text-admin-accent-hi border border-forest-500/20">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-admin-text font-display">
              ₹{totalAmount.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-admin-muted mt-1">
              {donations.length} total verified transactions
            </div>
          </div>
        </div>

        {/* This Month's Inflow */}
        <div className="p-5 rounded-2xl bg-admin-surface border border-admin-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-admin-muted">
              Raised This Month
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-emerald-400 font-display">
              ₹{(stats?.thisMonthAmount || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-admin-muted mt-1">
              {stats?.thisMonthCount || 0} donations in {new Date().toLocaleString('default', { month: 'long' })}
            </div>
          </div>
        </div>

        {/* 80G Certificates Issued */}
        <div className="p-5 rounded-2xl bg-admin-surface border border-admin-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-admin-muted">
              80G Tax Deductible
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-purple-300 font-display">
              {count80g}
            </div>
            <div className="text-[11px] text-admin-muted mt-1">
              Certificates eligible for Form 10BD filing
            </div>
          </div>
        </div>

        {/* Monthly Recurring Donors */}
        <div className="p-5 rounded-2xl bg-admin-surface border border-admin-border relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-admin-muted">
              Monthly Sponsorships
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-blue-300 font-display">
              {monthlyCount}
            </div>
            <div className="text-[11px] text-admin-muted mt-1">
              Top purpose: <strong className="text-admin-text/90">{stats?.topPurpose || 'General'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Category / Scope Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-admin-accent text-white shadow-sm'
                : 'bg-admin-surface text-admin-muted hover:text-admin-text border border-admin-border'
            }`}
          >
            All Donors ({donations.length})
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'monthly'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-admin-surface text-blue-400 hover:text-blue-300 border border-admin-border'
            }`}
          >
            🔄 Monthly ({monthlyCount})
          </button>
          <button
            onClick={() => setActiveTab('with_email')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'with_email'
                ? 'bg-admin-accent text-white shadow-sm'
                : 'bg-admin-surface text-admin-muted hover:text-admin-text border border-admin-border'
            }`}
          >
            ✉️ With Email ({withEmailDonorsCount})
          </button>
          <button
            onClick={() => setActiveTab('no_email')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === 'no_email'
                ? 'bg-amber-500 text-black shadow-sm font-bold'
                : 'bg-admin-surface text-amber-400 hover:text-amber-300 border border-admin-border'
            }`}
          >
            📱 Mobile Only ({noEmailDonorsCount})
          </button>
        </div>

        {/* Date & 80G Dropdown Filters */}
        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-admin-surface border border-admin-border rounded-lg text-xs text-admin-text px-3 py-1.5 focus:outline-none focus:border-admin-accent cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="fy">Financial Year 2025-26</option>
          </select>

          {/* 80G Tax Selector */}
          <select
            value={filter80G}
            onChange={(e) => setFilter80G(e.target.value)}
            className="bg-admin-surface border border-admin-border rounded-lg text-xs text-admin-text px-3 py-1.5 focus:outline-none focus:border-admin-accent cursor-pointer"
          >
            <option value="all">All Tax Types</option>
            <option value="80g_only">80G Certificates Only</option>
            <option value="standard_only">Standard (Non-80G)</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-panel p-6 rounded-2xl border border-admin-border space-y-6">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-admin-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by donor name, PAN, email, phone, Razorpay ID, or cause..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-admin-surface border border-admin-border rounded-xl pl-11 pr-4 py-3 text-sm text-admin-text focus:outline-none focus:border-admin-accent transition-colors"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-admin-muted text-sm">
            Loading verified donor entries...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-admin-border rounded-xl text-admin-muted space-y-2">
            <Heart className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm">
              {searchQuery ? 'No donor records match your search query.' : 'No verified donations found for the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b border-admin-border text-admin-muted text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Donor Details</th>
                  <th className="py-3.5 px-4 font-semibold">Purpose & Type</th>
                  <th className="py-3.5 px-4 font-semibold">Contribution</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold">Tax Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((item) => {
                  const hasEmail = Boolean(item.email && item.email.trim() && item.email.includes('@'));
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-admin-text font-semibold text-sm">{item.name}</span>
                            {!hasEmail && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                📱 No Email
                              </span>
                            )}
                          </div>
                          {hasEmail ? (
                            <span className="text-admin-muted text-xs font-mono select-all mt-0.5">{item.email}</span>
                          ) : (
                            <span className="text-amber-400/90 text-[11px] font-medium mt-0.5">📱 Mobile Contact Only</span>
                          )}
                          {item.phone && (
                            <span className="text-admin-text font-mono text-xs select-all mt-0.5 flex items-center gap-1">
                              📞 {item.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-forest-500/10 text-forest-400 border border-forest-500/20">
                            {item.purpose || 'General NGO Support'}
                          </span>
                          {item.frequency === 'monthly' && (
                            <span className="block text-[10px] font-bold text-blue-400">
                              🔄 Monthly Sponsorship
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-admin-accent-hi text-base block">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-admin-muted font-mono block">
                          Ref: {item.transactionRef || item.id}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-admin-muted text-xs">
                        {new Date(item.date).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        {item.claim80g ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/20">
                              <FileText className="w-3 h-3" />
                              80G CLAIMED
                            </span>
                            <span className="block text-[10px] font-mono text-admin-muted">
                              PAN: <strong className="text-admin-text">{item.panNumber || 'Pending'}</strong>
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            VERIFIED
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 80G Receipt PDF Download Button */}
                          <a
                            href={`/api/donations/${item.id}/receipt`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-forest-500/15 hover:bg-forest-600 border border-forest-500/30 text-admin-accent-hi hover:text-white transition-all inline-flex items-center justify-center cursor-pointer shadow-sm"
                            title="Download 80G Tax Exemption Receipt (PDF)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {item.phone && (
                            <a
                              href={`https://wa.me/91${item.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Hi ${item.name}, thank you for supporting Lakshya NGO for ${item.purpose}! We have verified your donation contribution of ₹${item.amount}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white transition-all text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                              title="Chat with Donor on WhatsApp"
                            >
                              <span>💬</span>
                            </a>
                          )}

                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg bg-admin-danger/10 hover:bg-admin-danger border border-admin-danger/20 text-admin-danger hover:text-white transition-all inline-flex items-center justify-center cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
