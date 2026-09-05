import React, { useState, useEffect } from 'react';
import { Mail, Search, Download, Trash2, Users, FileSpreadsheet, Eye, BookOpen, Inbox, Calendar, Phone, CheckCircle, HelpCircle } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAdminStore } from '../store/useAdminStore';
import CMSModal from '../components/ui/CMSModal';

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'contact' | 'volunteer' | 'career'
  const [selectedSub, setSelectedSub] = useState(null);
  
  const pinHash = useAdminStore((state) => state.pinHash);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/submissions', {
        headers: {
          'x-cms-pin-hash': pinHash || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [pinHash]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash || '',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === id ? { ...sub, status: newStatus } : sub))
        );
        if (selectedSub && selectedSub.id === id) {
          setSelectedSub((prev) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this submission forever?')) {
      return;
    }

    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          'x-cms-pin-hash': pinHash || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) => prev.filter((sub) => sub.id !== id));
        setSelectedSub(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewDetails = (sub) => {
    setSelectedSub(sub);
    if (sub.status === 'unread') {
      handleStatusChange(sub.id, 'read');
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      alert('No submissions to export.');
      return;
    }

    const filtered = getFilteredSubmissions();
    const headers = ['ID', 'Type', 'Name', 'Email', 'Phone', 'Subject', 'Date', 'Status', 'Message'];
    const rows = filtered.map((s) => [
      s.id,
      s.type,
      s.name,
      s.email,
      s.phone,
      s.subject,
      new Date(s.date).toLocaleString(),
      s.status,
      s.message,
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
    link.setAttribute('download', `form_submissions_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredSubmissions = () => {
    return submissions.filter((sub) => {
      // 1. Tab Filter
      if (activeTab === 'contact' && sub.type !== 'Contact Form') return false;
      if (activeTab === 'volunteer' && sub.type !== 'Volunteer Application') return false;
      if (activeTab === 'career' && (sub.type === 'Contact Form' || sub.type === 'Volunteer Application')) return false;

      // 2. Search Filter
      const search = searchQuery.toLowerCase();
      return (
        sub.name.toLowerCase().includes(search) ||
        sub.email.toLowerCase().includes(search) ||
        sub.subject.toLowerCase().includes(search) ||
        sub.message.toLowerCase().includes(search)
      );
    });
  };

  const filtered = getFilteredSubmissions();
  const unreadCount = submissions.filter((s) => s.status === 'unread').length;

  return (
    <div className="max-w-5xl mx-auto pb-24 font-sans text-left">
      <PageHeader
        title="Form Submissions Log"
        description="Review, filter, and export contact forms, volunteer applications, and job inquiries submitted by visitors."
        actions={
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-admin-accent hover:bg-admin-accent-hi disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Export list (CSV)</span>
          </button>
        }
      />

      {/* Stats and Filter Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
        <div className="glass-panel p-5 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-admin-accent/15 flex items-center justify-center text-admin-accent-hi">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-admin-muted uppercase tracking-wider">Total Submissions</p>
            <p className="text-xl font-bold text-admin-text font-display mt-0.5">{submissions.length}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-admin-danger/15 flex items-center justify-center text-admin-danger">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-admin-muted uppercase tracking-wider">Unread Enquiries</p>
            <p className="text-xl font-bold text-admin-text font-display mt-0.5">{unreadCount}</p>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-admin-accent/15 flex items-center justify-center text-admin-accent-hi">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-admin-muted uppercase tracking-wider">Latest Received</p>
            <p className="text-sm font-semibold text-admin-text mt-1 truncate">
              {submissions[0] ? new Date(submissions[0].date).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-admin-border pb-px mt-8 space-x-1">
        {[
          { id: 'all', label: 'All Messages' },
          { id: 'contact', label: 'Contact Forms' },
          { id: 'volunteer', label: 'Volunteer Apps' },
          { id: 'career', label: 'Careers & Inquiries' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-forest-500 text-admin-accent-hi'
                : 'border-transparent text-admin-muted hover:text-admin-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main log list */}
      <div className="glass-panel p-6 rounded-2xl border border-admin-border mt-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-admin-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, subject or message..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-admin-surface border border-admin-border rounded-xl pl-11 pr-4 py-3 text-sm text-admin-text focus:outline-none focus:border-admin-accent transition-colors"
          />
        </div>

        {loading ? (
          <div className="text-center py-12 text-admin-muted text-sm">
            Loading submission logs...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-admin-border rounded-xl text-admin-muted space-y-2">
            <Inbox className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm">
              {searchQuery ? 'No submissions match your query.' : 'No submissions found under this category.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b border-admin-border text-admin-muted text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Sender</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Subject Context</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((sub) => (
                  <tr 
                    key={sub.id} 
                    className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${
                      sub.status === 'unread' ? 'bg-forest-500/[0.02] font-semibold' : ''
                    }`}
                    onClick={() => handleViewDetails(sub)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-admin-text text-sm flex items-center gap-1.5">
                          {sub.name}
                          {sub.status === 'unread' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-admin-danger" title="Unread" />
                          )}
                        </span>
                        <span className="text-admin-muted text-xs font-mono mt-0.5">{sub.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        sub.type === 'Contact Form' 
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/15'
                          : sub.type === 'Volunteer Application'
                          ? 'bg-forest-500/15 text-forest-400 border border-forest-500/15'
                          : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/15'
                      }`}>
                        {sub.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-admin-text/80 text-xs max-w-xs truncate">
                      {sub.subject}
                    </td>
                    <td className="py-4 px-4 text-admin-muted text-xs">
                      {new Date(sub.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleViewDetails(sub)}
                          className="p-2 rounded-lg bg-admin-surface border border-admin-border text-admin-muted hover:text-admin-text transition-all"
                          title="View Message"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="p-2 rounded-lg bg-admin-danger/10 hover:bg-admin-danger border border-admin-danger/20 text-admin-danger hover:text-white transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed view Modal */}
      {selectedSub && (
        <CMSModal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Message Details — ${selectedSub.id}`}
        >
          <div className="space-y-6 text-admin-text text-left font-sans">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-admin-border pb-4">
              <div>
                <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Sender Name</p>
                <p className="text-sm font-semibold text-admin-text mt-1">{selectedSub.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Received Date</p>
                <p className="text-sm text-admin-text mt-1">{new Date(selectedSub.date).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Email Inbox</p>
                <p className="text-sm font-mono text-admin-text mt-1 select-all">{selectedSub.email}</p>
              </div>
              {selectedSub.phone && (
                <div>
                  <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Phone Number</p>
                  <p className="text-sm text-admin-text mt-1 select-all">{selectedSub.phone}</p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Type & Context</p>
              <p className="text-sm font-semibold text-admin-text">{selectedSub.type} {selectedSub.jobTitle ? `(${selectedSub.jobTitle})` : ''}</p>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Subject Line</p>
              <p className="text-sm text-admin-text">{selectedSub.subject}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Message Content</p>
              <div className="p-4 bg-admin-surface rounded-xl border border-admin-border text-sm leading-relaxed text-admin-text/90 whitespace-pre-wrap select-text max-h-60 overflow-y-auto">
                {selectedSub.message}
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-admin-border pt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(selectedSub.id, selectedSub.status === 'read' ? 'unread' : 'read')}
                  className="px-3 py-1.5 bg-admin-surface border border-admin-border text-xs rounded-lg text-admin-text hover:bg-white/5 transition-colors"
                >
                  Mark as {selectedSub.status === 'read' ? 'Unread' : 'Read'}
                </button>
              </div>
              <button
                onClick={() => handleDelete(selectedSub.id)}
                className="px-3 py-1.5 bg-admin-danger text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete submission
              </button>
            </div>
          </div>
        </CMSModal>
      )}
    </div>
  );
}
