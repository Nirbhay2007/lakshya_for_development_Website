import React, { useState, useEffect } from 'react';
import { Heart, Search, Download, Trash2, Users, IndianRupee, Calendar, CheckCircle2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAdminStore } from '../store/useAdminStore';

export default function Donations() {
  const [donations, setDonations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  const pinHash = useAdminStore((state) => state.pinHash);

  const fetchDonations = async () => {
    try {
      const res = await fetch('/api/donations', {
        headers: {
          'x-cms-pin-hash': pinHash || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setDonations(data.donations);
      }
    } catch (err) {
      console.error('Failed to load donations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [pinHash]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this donor record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/donations/${id}`, {
        method: 'DELETE',
        headers: {
          'x-cms-pin-hash': pinHash || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setDonations((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredDonations = () => {
    return donations.filter((item) => {
      const hasEmail = Boolean(item.email && item.email.trim() && item.email.includes('@'));

      if (activeTab === 'no_email' && hasEmail) return false;
      if (activeTab === 'with_email' && !hasEmail) return false;
      if (activeTab !== 'all' && activeTab !== 'no_email' && activeTab !== 'with_email' && item.purpose.toLowerCase() !== activeTab.toLowerCase()) {
        return false;
      }

      // Search Filter
      const search = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(search) ||
        (item.email && item.email.toLowerCase().includes(search)) ||
        (item.phone && item.phone.toLowerCase().includes(search)) ||
        item.purpose.toLowerCase().includes(search) ||
        item.amount.toString().includes(search)
      );
    });
  };

  const filtered = getFilteredDonations();
  const totalAmount = donations.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const avgAmount = donations.length > 0 ? Math.round(totalAmount / donations.length) : 0;
  const noEmailDonorsCount = donations.filter(d => !d.email || !d.email.includes('@')).length;
  const withEmailDonorsCount = donations.filter(d => d.email && d.email.includes('@')).length;

  const exportToCSV = () => {
    if (filtered.length === 0) {
      alert('No donation records to export.');
      return;
    }

    const headers = ['Transaction ID', 'Donor Name', 'Email Address', 'Mobile Number', 'Purpose / Cause', 'Amount (INR)', 'Date & Time', 'Status'];
    const rows = filtered.map((d) => [
      d.id,
      d.name,
      d.email || 'N/A (No Email)',
      d.phone || 'N/A',
      d.purpose,
      d.amount,
      new Date(d.date).toLocaleString(),
      d.status || 'SUCCESS'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `donations_log_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get unique purposes for tabs
  const uniquePurposes = Array.from(new Set(donations.map((d) => d.purpose))).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto pb-24 font-sans text-left">
      <PageHeader
        title="Donations Log & Donors List"
        description="Track verified successful donor contributions, purpose allocations, donor contact info, and export reports."
        actions={
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-admin-accent hover:bg-admin-accent-hi disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Export Donors List (CSV)</span>
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="glass-panel p-5 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-forest-500/15 flex items-center justify-center text-forest-400 shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-admin-muted uppercase tracking-wider">Total Raised</p>
            <p className="text-xl font-bold text-admin-text font-display mt-0.5">₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-admin-accent/15 flex items-center justify-center text-admin-accent-hi shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-admin-muted uppercase tracking-wider">Total Donors</p>
            <p className="text-xl font-bold text-admin-text font-display mt-0.5">{donations.length}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 flex items-center gap-4 bg-amber-500/5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
            <span className="text-lg">📱</span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-400/90 uppercase tracking-wider">No Email (Phone Only)</p>
            <p className="text-xl font-bold text-amber-300 font-display mt-0.5">{noEmailDonorsCount}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-admin-muted uppercase tracking-wider">Average Contribution</p>
            <p className="text-xl font-bold text-admin-text font-display mt-0.5">₹{avgAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Purpose Tabs */}
      <div className="flex border-b border-admin-border pb-px mt-8 space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
            activeTab === 'all'
              ? 'border-forest-500 text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          All Causes ({donations.length})
        </button>

        <button
          onClick={() => setActiveTab('no_email')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'no_email'
              ? 'border-amber-500 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-amber-400/70 hover:text-amber-400'
          }`}
        >
          <span>📱 No Email Donors ({noEmailDonorsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('with_email')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
            activeTab === 'with_email'
              ? 'border-forest-500 text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          ✉️ With Email ({withEmailDonorsCount})
        </button>

        {uniquePurposes.map((purpose) => (
          <button
            key={purpose}
            onClick={() => setActiveTab(purpose)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
              activeTab === purpose
                ? 'border-forest-500 text-admin-accent-hi'
                : 'border-transparent text-admin-muted hover:text-admin-text'
            }`}
          >
            {purpose}
          </button>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="glass-panel p-6 rounded-2xl border border-admin-border mt-6 space-y-6">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-admin-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search donors by name, email, phone, purpose or amount..."
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
              {searchQuery ? 'No donor records match your search query.' : 'No verified donations logged in this section.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b border-admin-border text-admin-muted text-xs uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">Donor Details</th>
                  <th className="py-3.5 px-4 font-semibold">Purpose / Cause</th>
                  <th className="py-3.5 px-4 font-semibold">Contribution</th>
                  <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((item) => {
                  const hasEmail = Boolean(item.email && item.email.trim() && item.email.includes('@'));
                  return (
                    <tr key={item.id} className={`hover:bg-white/[0.01] transition-colors ${!hasEmail ? 'bg-amber-500/[0.02]' : ''}`}>
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
                            <span className="text-admin-text font-mono text-xs font-bold select-all mt-1 flex items-center gap-1">
                              📞 {item.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-forest-500/10 text-forest-400 border border-forest-500/20">
                          {item.purpose}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-admin-accent-hi text-base">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-admin-muted text-xs">
                        {new Date(item.date).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          SUCCESS
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {item.phone && (
                            <a
                              href={`https://wa.me/91${item.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Hi ${item.name}, thank you for supporting Lakshya NGO for ${item.purpose}! We have verified your donation contribution of ₹${item.amount}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-300 hover:text-white transition-all text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                              title="Chat with Donor on WhatsApp"
                            >
                              <span>💬 WhatsApp</span>
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
