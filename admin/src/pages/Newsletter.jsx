import React, { useState, useEffect } from 'react';
import { Mail, Search, Download, Trash2, Users, FileSpreadsheet, Send, Upload, Tag, Filter } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAdminStore } from '../store/useAdminStore';
import CMSInput from '../components/ui/CMSInput';

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [presets, setPresets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingEmail, setDeletingEmail] = useState(null);

  const [targetFilter, setTargetFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  
  const pinHash = useAdminStore((state) => state.pinHash);

  // Fetch presets from donate section configuration to build cause filters
  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await fetch('/api/cms/donate', {
          headers: {
            'x-cms-pin-hash': pinHash || '',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.presets)) {
            setPresets(data.presets);
          }
        }
      } catch (err) {
        console.warn('Failed to load donation presets for newsletter filters:', err);
      }
    }
    loadPresets();
  }, [pinHash]);

  const fetchSubscribers = async () => {
    try {
      const res = await fetch('/api/newsletter/subscribers', {
        headers: {
          'x-cms-pin-hash': pinHash || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setSubscribers(data.subscribers.sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (err) {
      console.error('Failed to load subscribers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, [pinHash]);

  // Derive all unique subscriber types and merge with donation preset titles
  const allCauseOptions = React.useMemo(() => {
    const presetTitles = presets.map(p => p.title).filter(Boolean);
    const existingSubscriberTypes = Array.from(
      new Set(
        subscribers.flatMap(s => (Array.isArray(s.types) ? s.types : s.type ? [s.type] : ['General Updates']))
      )
    );

    const merged = Array.from(new Set(['General Updates', ...presetTitles, ...existingSubscriberTypes]));
    return merged;
  }, [presets, subscribers]);

  const getRecipientCount = (filterId) => {
    if (filterId === 'all') return subscribers.length;
    return subscribers.filter(s => {
      const types = Array.isArray(s.types) ? s.types : s.type ? [s.type] : ['General Updates'];
      return types.includes(filterId);
    }).length;
  };

  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed.');
      return;
    }

    setPdfFile(file);
    setUploadingPdf(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/newsletter/upload', {
        method: 'POST',
        headers: {
          'x-cms-pin-hash': pinHash || '',
        },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setUploadedPdfUrl(data.url);
      } else {
        alert(data.message || 'PDF upload failed.');
        setPdfFile(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload PDF.');
      setPdfFile(null);
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastSubject || !uploadedPdfUrl) {
      alert('Please fill in the subject and upload a PDF newsletter.');
      return;
    }

    const count = getRecipientCount(targetFilter);
    const filterLabel = targetFilter === 'all' ? 'All Subscribers' : targetFilter;

    if (!window.confirm(`Are you sure you want to send this newsletter to ${count} subscriber(s) under "${filterLabel}" now?`)) {
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await fetch('/api/newsletter/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cms-pin-hash': pinHash || '',
        },
        body: JSON.stringify({
          subject: broadcastSubject,
          pdfUrl: uploadedPdfUrl,
          targetFilter
        })
      });
      const result = await res.json();
      if (result.success) {
        alert(result.message);
        setBroadcastSubject('');
        setPdfFile(null);
        setUploadedPdfUrl('');
      } else {
        alert(result.message || 'Failed to dispatch newsletter broadcast.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error sending broadcast.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleDelete = async (email) => {
    if (!window.confirm(`Are you sure you want to remove "${email}" from the newsletter list?`)) {
      return;
    }

    setDeletingEmail(email);
    try {
      const res = await fetch(`/api/newsletter/subscribers/${encodeURIComponent(email)}`, {
        method: 'DELETE',
        headers: {
          'x-cms-pin-hash': pinHash || '',
        },
      });
      const data = await res.json();
      if (data.success) {
        setSubscribers(prev => prev.filter(s => s.email !== email));
      } else {
        alert(data.message || 'Failed to remove subscriber.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error removing subscriber.');
    } finally {
      setDeletingEmail(null);
    }
  };

  const exportToCSV = () => {
    if (subscribers.length === 0) {
      alert('No subscribers to export.');
      return;
    }

    const headers = ['Email Address', 'Subscribed Causes / Types', 'Subscription Date (ISO)', 'Local Date Joined'];
    const rows = subscribers.map(s => {
      const types = Array.isArray(s.types) ? s.types.join('; ') : (s.type || 'General Updates');
      return [
        s.email,
        types,
        s.date,
        new Date(s.date).toLocaleString()
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter_subscribers_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter subscribers by Search Query & Tab Filter
  const filteredSubscribers = subscribers.filter(s => {
    const types = Array.isArray(s.types) ? s.types : s.type ? [s.type] : ['General Updates'];
    
    // Tab Filter
    if (activeTab !== 'all' && !types.includes(activeTab)) {
      return false;
    }

    // Search Query
    const search = searchQuery.toLowerCase();
    return (
      s.email.toLowerCase().includes(search) ||
      types.some(t => t.toLowerCase().includes(search))
    );
  });

  return (
    <div className="max-w-5xl mx-auto pb-24 text-left font-sans">
      <PageHeader
        title="Newsletter Subscribers & Campaign Broadcast"
        subtitle="Segment subscribers by donor causes, manage sign-ups, and send PDF newsletter updates to specific target audiences."
        icon={Mail}
        actions={
          <button
            onClick={exportToCSV}
            disabled={subscribers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-admin-accent hover:bg-admin-accent-hi disabled:opacity-50 text-white rounded-xl font-medium transition-colors shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel (CSV)</span>
          </button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
        <div className="glass-panel p-6 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-admin-accent/15 flex items-center justify-center text-admin-accent-hi">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Total Subscribers</p>
            <p className="text-2xl font-bold text-admin-text font-display mt-0.5">{subscribers.length}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-forest-500/15 flex items-center justify-center text-forest-400">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Cause Categories</p>
            <p className="text-2xl font-bold text-admin-text font-display mt-0.5">{allCauseOptions.length}</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-admin-border flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Export Format</p>
            <p className="text-sm font-medium text-admin-text mt-1">Excel & CSV Compatible (.csv)</p>
          </div>
        </div>
      </div>

      {/* Broadcast Composer with Audience Target Selection */}
      <div className="glass-panel p-6 rounded-2xl border border-admin-border mt-8 space-y-4 text-left">
        <h3 className="text-sm font-bold text-admin-muted uppercase tracking-wider border-b border-admin-border pb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-admin-accent-hi" />
          Targeted Newsletter PDF Broadcast
        </h3>
        <p className="text-xs text-admin-muted leading-relaxed">
          Select a subscriber audience filter (e.g. <strong>All Subscribers</strong> or a specific donor cause like <strong>Tree Plantation Drive</strong>), upload a PDF newsletter, and dispatch it to donors so they can see how their contributions are making an impact.
        </p>

        <form onSubmit={handleBroadcast} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CMSInput
              label="Email Subject"
              value={broadcastSubject}
              onChange={setBroadcastSubject}
              placeholder="e.g. Quarterly Impact Report - Tree Plantation Drive"
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-admin-muted uppercase tracking-wider block">
                Target Recipient Audience
              </label>
              <select
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value)}
                className="w-full bg-admin-surface border border-admin-border rounded-xl px-4 py-3 text-sm text-admin-text focus:outline-none focus:border-admin-accent transition-colors"
              >
                <option value="all">All Subscribers ({getRecipientCount('all')})</option>
                {allCauseOptions.map(option => (
                  <option key={option} value={option}>
                    {option === 'General Updates' ? 'General Website Subscribers' : option} ({getRecipientCount(option)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-admin-muted uppercase tracking-wider block">
              Upload Newsletter PDF Document
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-3 bg-admin-surface border border-admin-border hover:border-admin-accent rounded-xl cursor-pointer transition-all select-none text-sm text-admin-text font-medium">
                <Upload className="w-4 h-4 text-admin-muted" />
                <span>{pdfFile ? pdfFile.name : 'Choose PDF File...'}</span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                />
              </label>
              {uploadingPdf && (
                <span className="text-xs text-admin-muted">Uploading PDF file...</span>
              )}
              {!uploadingPdf && uploadedPdfUrl && (
                <span className="text-xs text-admin-accent-hi flex items-center gap-1 font-semibold">
                  ✓ PDF Uploaded
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isBroadcasting || uploadingPdf || !broadcastSubject || !uploadedPdfUrl || getRecipientCount(targetFilter) === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-admin-accent hover:bg-admin-accent-hi disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-md cursor-pointer"
            >
              {isBroadcasting ? (
                <span>Sending Broadcast...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>
                    Send Broadcast ({getRecipientCount(targetFilter)} Recipient{getRecipientCount(targetFilter) !== 1 ? 's' : ''} for {targetFilter === 'all' ? 'All Subscribers' : targetFilter})
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Category Tabs & Subscriber List */}
      <div className="mt-8 space-y-4">
        <div className="flex border-b border-admin-border pb-px space-x-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
              activeTab === 'all'
                ? 'border-forest-500 text-admin-accent-hi'
                : 'border-transparent text-admin-muted hover:text-admin-text'
            }`}
          >
            All Causes ({subscribers.length})
          </button>
          {allCauseOptions.map(option => {
            const count = getRecipientCount(option);
            return (
              <button
                key={option}
                onClick={() => setActiveTab(option)}
                className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                  activeTab === option
                    ? 'border-forest-500 text-admin-accent-hi'
                    : 'border-transparent text-admin-muted hover:text-admin-text'
                }`}
              >
                {option === 'General Updates' ? 'General' : option} ({count})
              </button>
            );
          })}
        </div>

        {/* Main Search & Table Container */}
        <div className="glass-panel p-6 rounded-2xl border border-admin-border space-y-6">
          <div className="relative">
            <Search className="w-4 h-4 text-admin-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subscribers by email address or cause tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-admin-surface border border-admin-border rounded-xl pl-11 pr-4 py-3 text-sm text-admin-text focus:outline-none focus:border-admin-accent transition-colors"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-admin-muted text-sm">
              Loading subscriber list...
            </div>
          ) : filteredSubscribers.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-admin-border rounded-xl text-admin-muted space-y-2">
              <Mail className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sm">
                {searchQuery ? 'No subscribers match your search query.' : 'No subscribers found for this category.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-sans border-collapse">
                <thead>
                  <tr className="border-b border-admin-border text-admin-muted text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">Email Address</th>
                    <th className="py-3.5 px-4 font-semibold">Subscribed Causes / Types</th>
                    <th className="py-3.5 px-4 font-semibold">Date Joined</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredSubscribers.map((sub, idx) => {
                    const types = Array.isArray(sub.types) ? sub.types : sub.type ? [sub.type] : ['General Updates'];
                    return (
                      <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-4 font-mono font-medium text-admin-text select-all">{sub.email}</td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {types.map((typeTag, tIdx) => (
                              <span
                                key={tIdx}
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                  typeTag === 'General Updates'
                                    ? 'bg-admin-accent/15 text-admin-accent-hi border-admin-accent/20'
                                    : 'bg-forest-500/15 text-forest-400 border-forest-500/20'
                                }`}
                              >
                                {typeTag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-admin-muted text-xs">
                          {new Date(sub.date).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleDelete(sub.email)}
                            disabled={deletingEmail === sub.email}
                            className="p-2 rounded-lg bg-admin-danger/10 hover:bg-admin-danger border border-admin-danger/20 text-admin-danger hover:text-white disabled:opacity-50 transition-all inline-flex items-center justify-center"
                            title="Remove Subscriber"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
    </div>
  );
}
