import React, { useState, useEffect } from 'react';
import { 
  Mail, Search, Download, Trash2, Users, FileSpreadsheet, 
  Eye, BookOpen, Inbox, Calendar, Phone, CheckCircle, 
  HelpCircle, MessageSquare, Clock, ArrowUpRight, Send, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/layout/PageHeader';
import { useAdminStore } from '../store/useAdminStore';
import CMSModal from '../components/ui/CMSModal';

const STATUS_CONFIG = {
  NEW: {
    label: 'New Lead',
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400'
  },
  IN_REVIEW: {
    label: 'In Review',
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    dot: 'bg-purple-400'
  },
  CONTACTED: {
    label: 'Contacted',
    bg: 'bg-sky-500/15',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    dot: 'bg-sky-400'
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-forest-500/15',
    text: 'text-forest-400',
    border: 'border-forest-500/30',
    dot: 'bg-forest-400'
  }
};

const getNormalizedStatus = (status) => {
  if (!status || status === 'unread') return 'NEW';
  if (status === 'read') return 'IN_REVIEW';
  const upper = status.toUpperCase().replace(/\s+/g, '_');
  if (STATUS_CONFIG[upper]) return upper;
  return 'NEW';
};

export default function Submissions() {
  const [submissions, setSubmissions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'contact' | 'volunteer' | 'career'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'NEW' | 'IN_REVIEW' | 'CONTACTED' | 'RESOLVED'
  const [selectedSub, setSelectedSub] = useState(null);
  const [modalNotes, setModalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  
  const pinHash = useAdminStore((state) => state.pinHash);
  const token = useAdminStore((state) => state.token);

  const getHeaders = () => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (pinHash) headers['x-cms-pin-hash'] = pinHash;
    return headers;
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch('/api/submissions', { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [pinHash, token]);

  const handleStatusChange = async (id, newStatus, newNotes = null) => {
    try {
      const body = { status: newStatus };
      if (newNotes !== null) body.notes = newNotes;

      const res = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) =>
          prev.map((sub) => (sub.id === id ? { ...sub, status: newStatus, notes: newNotes !== null ? newNotes : sub.notes } : sub))
        );
        if (selectedSub && selectedSub.id === id) {
          setSelectedSub((prev) => ({ ...prev, status: newStatus, notes: newNotes !== null ? newNotes : prev.notes }));
        }
        toast.success(`Status: ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      } else {
        toast.error(data.message || 'Status update failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error updating status');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedSub) return;
    setSavingNotes(true);
    try {
      await handleStatusChange(selectedSub.id, getNormalizedStatus(selectedSub.status), modalNotes);
      toast.success('Internal notes saved successfully');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this submission forever? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSubmissions((prev) => prev.filter((sub) => sub.id !== id));
        if (selectedSub?.id === id) setSelectedSub(null);
        toast.success('Submission permanently deleted');
      } else {
        toast.error(data.message || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network error during deletion');
    }
  };

  const handleViewDetails = (sub) => {
    setSelectedSub(sub);
    setModalNotes(sub.notes || '');
    if (getNormalizedStatus(sub.status) === 'NEW') {
      handleStatusChange(sub.id, 'IN_REVIEW');
    }
  };

  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast.error('No submissions to export.');
      return;
    }

    const filtered = getFilteredSubmissions();
    const headers = ['ID', 'Type', 'Name', 'Email', 'Phone', 'Subject', 'Date', 'Status', 'Message', 'Internal Notes'];
    const rows = filtered.map((s) => [
      s.id,
      s.type,
      s.name,
      s.email,
      s.phone || '',
      s.subject,
      new Date(s.date).toISOString(),
      getNormalizedStatus(s.status),
      s.message,
      s.notes || ''
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
    link.setAttribute('download', `form_submissions_${activeTab}_${statusFilter.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filtered.length} submission records to CSV`);
  };

  const getFilteredSubmissions = () => {
    return submissions.filter((sub) => {
      // 1. Tab Filter
      if (activeTab === 'contact' && sub.type !== 'Contact Form') return false;
      if (activeTab === 'volunteer' && sub.type !== 'Volunteer Application') return false;
      if (activeTab === 'career' && (sub.type === 'Contact Form' || sub.type === 'Volunteer Application')) return false;

      // 2. Status Filter
      const curStatus = getNormalizedStatus(sub.status);
      if (statusFilter !== 'ALL' && curStatus !== statusFilter) return false;

      // 3. Search Filter
      const search = searchQuery.toLowerCase();
      return (
        (sub.name && sub.name.toLowerCase().includes(search)) ||
        (sub.email && sub.email.toLowerCase().includes(search)) ||
        (sub.subject && sub.subject.toLowerCase().includes(search)) ||
        (sub.message && sub.message.toLowerCase().includes(search)) ||
        (sub.notes && sub.notes.toLowerCase().includes(search))
      );
    });
  };

  const filtered = getFilteredSubmissions();
  
  // KPI counts
  const newCount = submissions.filter((s) => getNormalizedStatus(s.status) === 'NEW').length;
  const inReviewCount = submissions.filter((s) => getNormalizedStatus(s.status) === 'IN_REVIEW').length;
  const contactedCount = submissions.filter((s) => getNormalizedStatus(s.status) === 'CONTACTED').length;
  const resolvedCount = submissions.filter((s) => getNormalizedStatus(s.status) === 'RESOLVED').length;

  return (
    <div className="max-w-6xl mx-auto pb-24 font-sans text-left">
      <PageHeader
        title="Inquiries & Form Submissions"
        description="Track incoming donor questions, volunteer applications, and career submissions through a structured lead lifecycle."
        actions={
          <button
            onClick={exportToCSV}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-admin-accent hover:bg-admin-accent-hi disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        }
      />

      {/* KPI Workflow Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <button
          onClick={() => setStatusFilter(statusFilter === 'NEW' ? 'ALL' : 'NEW')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'NEW' 
              ? 'bg-amber-500/15 border-amber-500/40 shadow-lg' 
              : 'glass-panel border-admin-border hover:border-admin-border-hi'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">New Leads</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <p className="text-2xl font-bold text-admin-text font-display mt-2">{newCount}</p>
          <p className="text-[11px] text-admin-muted mt-0.5">Awaiting initial review</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'IN_REVIEW' 
              ? 'bg-purple-500/15 border-purple-500/40 shadow-lg' 
              : 'glass-panel border-admin-border hover:border-admin-border-hi'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">In Review</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-admin-text font-display mt-2">{inReviewCount}</p>
          <p className="text-[11px] text-admin-muted mt-0.5">Under evaluation</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'CONTACTED' ? 'ALL' : 'CONTACTED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'CONTACTED' 
              ? 'bg-sky-500/15 border-sky-500/40 shadow-lg' 
              : 'glass-panel border-admin-border hover:border-admin-border-hi'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Contacted</span>
            <Phone className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-admin-text font-display mt-2">{contactedCount}</p>
          <p className="text-[11px] text-admin-muted mt-0.5">Staff reached out</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'RESOLVED' 
              ? 'bg-forest-500/15 border-forest-500/40 shadow-lg' 
              : 'glass-panel border-admin-border hover:border-admin-border-hi'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-forest-400">Resolved</span>
            <CheckCircle className="w-4 h-4 text-forest-400" />
          </div>
          <p className="text-2xl font-bold text-admin-text font-display mt-2">{resolvedCount}</p>
          <p className="text-[11px] text-admin-muted mt-0.5">Handled & closed</p>
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border pb-px mt-8">
        <div className="flex space-x-1 overflow-x-auto hide-scrollbar">
          {[
            { id: 'all', label: 'All Submissions' },
            { id: 'contact', label: 'Contact Inquiries' },
            { id: 'volunteer', label: 'Volunteer Apps' },
            { id: 'career', label: 'Careers' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-forest-500 text-admin-accent-hi'
                  : 'border-transparent text-admin-muted hover:text-admin-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 pb-2">
          {['ALL', 'NEW', 'IN_REVIEW', 'CONTACTED', 'RESOLVED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-admin-accent text-white shadow-sm'
                  : 'bg-admin-surface border border-admin-border text-admin-muted hover:text-admin-text'
              }`}
            >
              {st === 'ALL' ? 'All Statuses' : STATUS_CONFIG[st]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main log list */}
      <div className="glass-panel p-6 rounded-2xl border border-admin-border mt-6 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-admin-muted absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by sender name, email, phone, subject, or message text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-admin-surface border border-admin-border rounded-xl pl-11 pr-4 py-3 text-sm text-admin-text focus:outline-none focus:border-admin-accent transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-admin-muted hover:text-admin-text"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-admin-muted text-sm">
            Loading submission records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-admin-border rounded-xl text-admin-muted space-y-2">
            <Inbox className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-sm">
              {searchQuery ? 'No submissions match your search filter.' : 'No submissions found under this filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse">
              <thead>
                <tr className="border-b border-admin-border text-admin-muted text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Sender</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Subject / Preview</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((sub) => {
                  const currentStatus = getNormalizedStatus(sub.status);
                  const statusConf = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.NEW;

                  return (
                    <tr 
                      key={sub.id} 
                      className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${
                        currentStatus === 'NEW' ? 'bg-amber-500/[0.03] font-semibold' : ''
                      }`}
                      onClick={() => handleViewDetails(sub)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex flex-col">
                          <span className="text-admin-text text-sm flex items-center gap-2">
                            {sub.name}
                            {currentStatus === 'NEW' && (
                              <span className="w-2 h-2 rounded-full bg-amber-400" title="New unreviewed lead" />
                            )}
                          </span>
                          <span className="text-admin-muted text-xs font-mono mt-0.5">{sub.email}</span>
                          {sub.phone && (
                            <span className="text-admin-muted/70 text-[11px] font-mono">{sub.phone}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          sub.type === 'Contact Form' 
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            : sub.type === 'Volunteer Application'
                            ? 'bg-forest-500/15 text-forest-400 border border-forest-500/20'
                            : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {sub.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-admin-text text-xs truncate font-medium">{sub.subject}</p>
                        <p className="text-admin-muted text-[11px] truncate mt-0.5">{sub.message}</p>
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        {/* Quick status dropdown */}
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(sub.id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border focus:outline-none cursor-pointer ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                        >
                          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key} className="bg-admin-surface text-admin-text">
                              {cfg.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-4 px-4 text-admin-muted text-xs whitespace-nowrap">
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
                            className="p-2 rounded-lg bg-admin-surface border border-admin-border text-admin-muted hover:text-admin-text transition-all cursor-pointer"
                            title="View Full Lead Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`mailto:${sub.email}?subject=Re: ${encodeURIComponent(sub.subject || 'Lakshya Foundation Inquiry')}`}
                            className="p-2 rounded-lg bg-admin-surface border border-admin-border text-admin-muted hover:text-admin-accent-hi transition-all cursor-pointer"
                            title="Reply via Email"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-2 rounded-lg bg-admin-danger/10 hover:bg-admin-danger border border-admin-danger/20 text-admin-danger hover:text-white transition-all cursor-pointer"
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

      {/* Detailed view Modal */}
      {selectedSub && (
        <CMSModal
          isOpen={!!selectedSub}
          onClose={() => setSelectedSub(null)}
          title={`Lead Details — ${selectedSub.id}`}
        >
          <div className="space-y-6 text-admin-text text-left font-sans">
            {/* Top metadata grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-admin-border pb-4">
              <div>
                <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Sender Name</p>
                <p className="text-base font-semibold text-admin-text mt-0.5">{selectedSub.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Submission Date</p>
                <p className="text-sm text-admin-text mt-0.5">{new Date(selectedSub.date).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Email Address</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-mono text-admin-text select-all">{selectedSub.email}</span>
                  <a
                    href={`mailto:${selectedSub.email}?subject=Re: ${encodeURIComponent(selectedSub.subject || 'Lakshya NGO Inquiry')}`}
                    className="text-xs text-admin-accent-hi hover:underline flex items-center gap-0.5"
                  >
                    <span>Reply</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Phone Number</p>
                {selectedSub.phone ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-mono text-admin-text select-all">{selectedSub.phone}</span>
                    <a
                      href={`tel:${selectedSub.phone}`}
                      className="text-xs text-admin-accent-hi hover:underline flex items-center gap-0.5"
                    >
                      <span>Call</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <span className="text-sm text-admin-muted mt-0.5">Not provided</span>
                )}
              </div>
            </div>

            {/* Lifecycle Status Selector */}
            <div className="space-y-2">
              <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Lead Lifecycle Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                  const isSelected = getNormalizedStatus(selectedSub.status) === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleStatusChange(selectedSub.id, key, modalNotes)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isSelected 
                          ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-forest-500/30`
                          : 'bg-admin-surface border-admin-border text-admin-muted hover:text-admin-text'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Category & Subject</p>
              <p className="text-sm font-semibold text-admin-text">
                <span className="text-admin-accent-hi font-bold">[{selectedSub.type}]</span> {selectedSub.subject}
                {selectedSub.jobTitle && <span className="text-admin-muted text-xs ml-2">({selectedSub.jobTitle})</span>}
              </p>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Submitted Message</p>
              <div className="p-4 bg-admin-surface rounded-xl border border-admin-border text-sm leading-relaxed text-admin-text/90 whitespace-pre-wrap select-text max-h-52 overflow-y-auto">
                {selectedSub.message}
              </div>
            </div>

            {/* Internal Staff Notes */}
            <div className="space-y-2 border-t border-admin-border pt-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-admin-muted uppercase tracking-wider font-semibold">Internal Team Notes & Next Steps</p>
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex items-center gap-1 text-xs text-admin-accent-hi hover:text-white font-medium cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
                </button>
              </div>
              <textarea
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="Log internal follow-up actions (e.g. 'Spoke to Ananya on 6th Sept, invited for interview next Tuesday')..."
                className="w-full bg-admin-surface border border-admin-border rounded-xl p-3 text-xs text-admin-text focus:outline-none focus:border-admin-accent resize-none h-20"
              />
            </div>

            <div className="flex justify-between items-center border-t border-admin-border pt-4">
              <button
                type="button"
                onClick={() => handleDelete(selectedSub.id)}
                className="px-3 py-1.5 bg-admin-danger/15 text-admin-danger border border-admin-danger/30 hover:bg-admin-danger hover:text-white text-xs rounded-lg transition-colors cursor-pointer"
              >
                Delete record
              </button>
              <button
                type="button"
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 bg-admin-surface border border-admin-border text-xs rounded-xl text-admin-text hover:bg-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </CMSModal>
      )}
    </div>
  );
}
