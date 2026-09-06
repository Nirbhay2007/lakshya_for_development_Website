import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, RotateCcw, X, Clock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminStore } from '../../store/useAdminStore';

export default function RevisionDrawer({ isOpen, onClose, sectionKey, onRollbackSuccess }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rollingBackId, setRollingBackId] = useState(null);
  const token = useAdminStore((state) => state.token);
  const pinHash = useAdminStore((state) => state.pinHash);

  useEffect(() => {
    if (isOpen && sectionKey) {
      fetchRevisions();
    }
  }, [isOpen, sectionKey]);

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (pinHash) headers['x-cms-pin-hash'] = pinHash;

      const res = await fetch(`/api/cms/${sectionKey}/revisions`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.revisions)) {
        setRevisions(data.revisions);
      } else {
        setRevisions([]);
      }
    } catch (err) {
      console.error('Failed fetching revisions:', err);
      toast.error('Failed to load revision history.');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (revId) => {
    if (!window.confirm('Are you sure you want to restore this revision? Your current draft will be overwritten.')) {
      return;
    }

    setRollingBackId(revId);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (pinHash) headers['x-cms-pin-hash'] = pinHash;

      const res = await fetch(`/api/cms/${sectionKey}/revisions/${revId}/rollback`, {
        method: 'POST',
        headers
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully restored version from ${new Date().toLocaleTimeString()}`);
        if (data.content) {
          localStorage.setItem(`lakshya_cms_${sectionKey}`, JSON.stringify(data.content));
          window.dispatchEvent(new CustomEvent(`lakshya_cms_${sectionKey}_update`));
        }
        if (onRollbackSuccess && data.content) {
          onRollbackSuccess(data.content);
        }
        onClose();
      } else {
        toast.error(data.message || 'Rollback failed.');
      }
    } catch (err) {
      console.error('Rollback request error:', err);
      toast.error('Failed to rollback revision.');
    } finally {
      setRollingBackId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="w-screen max-w-md bg-admin-surface border-l border-admin-border flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-5 border-b border-admin-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-admin-accent/10 border border-admin-accent/20 text-admin-accent-hi">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-admin-text capitalize">
                    {sectionKey} Revision History
                  </h3>
                  <p className="text-xs text-admin-muted">
                    Rolling 10-version history with 1-click restore
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-admin-muted hover:text-admin-text hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
              {loading ? (
                <div className="py-12 text-center text-xs text-admin-muted">
                  Loading saved snapshots...
                </div>
              ) : revisions.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-admin-muted/60 mx-auto" />
                  <p className="text-sm font-semibold text-admin-text">No previous revisions recorded yet</p>
                  <p className="text-xs text-admin-muted max-w-xs mx-auto">
                    A revision snapshot is automatically created each time you save or publish changes to {sectionKey}.
                  </p>
                </div>
              ) : (
                revisions.map((rev, index) => {
                  const dateObj = new Date(rev.timestamp);
                  const isLatest = index === 0;

                  return (
                    <div
                      key={rev.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isLatest
                          ? 'bg-admin-accent/5 border-admin-accent/30 shadow-sm'
                          : 'bg-admin-bg/60 border-admin-border hover:border-admin-border-hi'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-admin-text">
                              {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-admin-muted font-mono">
                              {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {isLatest && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-admin-accent/20 text-admin-accent-hi border border-admin-accent/30">
                                Current Live
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-admin-muted">
                            <User className="w-3 h-3" />
                            <span>Saved by: <strong className="text-admin-text/80">{rev.author}</strong></span>
                          </div>
                        </div>

                        {!isLatest && (
                          <button
                            type="button"
                            onClick={() => handleRollback(rev.id)}
                            disabled={rollingBackId === rev.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-admin-surface border border-admin-border hover:border-admin-accent text-admin-text hover:text-admin-accent-hi transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{rollingBackId === rev.id ? 'Restoring...' : 'Restore'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </div>
      </div>
    </AnimatePresence>
  );
}
