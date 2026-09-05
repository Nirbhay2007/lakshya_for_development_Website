import React, { useState, useMemo, useEffect } from 'react';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import CMSBadge from '../components/ui/CMSBadge';
import { Search, Download, Trash2, Calendar, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import SecurityLockPanel from '../components/ui/SecurityLockPanel';

export default function ActivityLog() {
  const logs = useAdminStore((state) => state.logs);
  const clearLogs = useAdminStore((state) => state.clearLogs);
  const fetchLogs = useAdminStore((state) => state.fetchLogs);
  const securityKeyHash = useAdminStore((state) => state.securityKeyHash);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    return () => {
      useAdminStore.getState().lockSecurity();
    };
  }, []);

  const [filterAction, setFilterAction] = useState('all');
  const [filterSection, setFilterSection] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'export' | 'clear'

  // Extract unique sections from logs for dropdown select options
  const uniqueSections = useMemo(() => {
    const sections = logs.map((log) => log.section);
    return ['all', ...new Set(sections)];
  }, [logs]);

  // Filter actions
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAction = filterAction === 'all' || log.action === filterAction;
      const matchesSection = filterSection === 'all' || log.section === filterSection;
      
      const searchStr = `${log.action} ${log.section} ${log.description}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      
      return matchesAction && matchesSection && matchesSearch;
    });
  }, [logs, filterAction, filterSection, searchQuery]);

  const executeExportCSV = () => {
    try {
      const headers = ['ID', 'Timestamp', 'Date', 'Action Type', 'Section Key', 'Description Details'];
      const rows = logs.map((log) => [
        log.id,
        log.timestamp,
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        log.action,
        log.section,
        log.description
      ]);

      const csvContent = [headers, ...rows]
        .map((e) => e.map((val) => `"${val.toString().replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `lakshya_cms_activity_trail_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('CSV compiler failed', e);
    }
  };

  // Export CSV backend
  const handleExportCSV = () => {
    if (!logs.length) return;
    if (!securityKeyHash) {
      setPendingAction('export');
      setShowLockModal(true);
      return;
    }
    executeExportCSV();
  };

  const handleClearConfirm = () => {
    if (!securityKeyHash) {
      setPendingAction('clear');
      setShowLockModal(true);
      return;
    }
    if (window.confirm('Are you sure you want to clear all history records? This cannot be undone.')) {
      clearLogs();
    }
  };

  return (
    <div className="space-y-6">
      {showLockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-admin-surface rounded-2xl shadow-2xl overflow-hidden border border-admin-border p-4">
            <button 
              onClick={() => {
                setShowLockModal(false);
                setPendingAction(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-admin-muted hover:text-admin-text transition-colors z-50 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="h-96 relative">
              <SecurityLockPanel onUnlock={() => {
                setShowLockModal(false);
                if (pendingAction === 'clear') {
                  if (window.confirm('Are you sure you want to clear all history records? This cannot be undone.')) {
                    clearLogs();
                  }
                } else if (pendingAction === 'export') {
                  executeExportCSV();
                }
                setPendingAction(null);
              }} />
            </div>
          </div>
        </div>
      )}
      <PageHeader
        title="Activity Log History"
        description="Read chronological audits of portal logins, content saves, slide reorders, and publishing activities."
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              disabled={!logs.length}
              className="flex items-center gap-1.5 admin-btn-secondary py-2 text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              <span>Export as CSV</span>
            </button>
            <button
              onClick={handleClearConfirm}
              disabled={!logs.length}
              className="flex items-center gap-1.5 admin-btn-danger py-2 text-xs font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear History</span>
            </button>
          </div>
        }
      />

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-admin-surface rounded-2xl border border-admin-border select-none">
        {/* Search Input */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input
            type="text"
            placeholder="Search activity description logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-xs text-admin-text"
          />
        </div>

        {/* Action Type Dropdown */}
        <div className="flex flex-col gap-1">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-admin-text cursor-pointer"
          >
            <option value="all">All Action Types</option>
            <option value="Created">Created</option>
            <option value="Updated">Updated</option>
            <option value="Deleted">Deleted</option>
            <option value="Published">Published</option>
            <option value="Security">Security</option>
          </select>
        </div>

        {/* Section Key Dropdown */}
        <div className="flex flex-col gap-1">
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="w-full glass-input rounded-xl px-3 py-2 text-xs text-admin-text cursor-pointer capitalize"
          >
            {uniqueSections.map((sect) => (
              <option key={sect} value={sect}>
                {sect === 'all' ? 'All Sections' : sect.replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RENDER LOG LIST */}
      <div className="glass-panel rounded-2xl border border-white/[0.04] overflow-hidden divide-y divide-admin-border">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between hover:bg-white/[0.01] transition-colors"
            >
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CMSBadge
                    variant={
                      log.action === 'Published'
                        ? 'success'
                        : log.action === 'Deleted'
                        ? 'danger'
                        : log.action === 'Security'
                        ? 'warning'
                        : 'primary'
                    }
                  >
                    {log.action}
                  </CMSBadge>
                  
                  <span className="font-semibold text-xs text-admin-text capitalize font-mono bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                    {log.section.replace('-', ' ')}
                  </span>
                </div>
                
                <p className="text-xs text-admin-text/80 leading-relaxed font-sans">{log.description}</p>
              </div>

              <div className="flex items-center gap-2 sm:text-right shrink-0 select-none text-[10px] text-admin-muted font-mono">
                <Calendar className="w-3.5 h-3.5 text-admin-muted" />
                <div className="flex flex-col">
                  <span>{formatDistanceToNow(new Date(log.timestamp))} ago</span>
                  <span className="text-[9px] text-admin-muted/60">
                    {format(new Date(log.timestamp), 'MMM dd, hh:mm a')}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-admin-muted text-xs">
            No activity records matched the selected query search filter parameters.
          </div>
        )}
      </div>
    </div>
  );
}
