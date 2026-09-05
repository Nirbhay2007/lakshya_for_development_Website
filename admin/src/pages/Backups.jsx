import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, RotateCcw, Trash2, Plus, AlertTriangle, Clock, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { useAdminStore } from '../store/useAdminStore';
import SecurityLockPanel from '../components/ui/SecurityLockPanel';

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { pinHash, securityKeyHash } = useAdminStore();
  const [isUnlocked, setIsUnlocked] = useState(!!securityKeyHash);

  const fetchBackups = async () => {
    try {
      const res = await fetch('/api/backups', {
        headers: { 
          'x-cms-pin-hash': pinHash,
          'x-cms-security-key-hash': securityKeyHash || ''
        }
      });
      const data = await res.json();
      if (data.success) {
        setBackups(data.backups);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pinHash && securityKeyHash) fetchBackups();
  }, [pinHash, securityKeyHash]);

  useEffect(() => {
    return () => {
      useAdminStore.getState().lockSecurity();
    };
  }, []);

  const createBackup = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 
          'x-cms-pin-hash': pinHash,
          'x-cms-security-key-hash': securityKeyHash || ''
        }
      });
      if (res.ok) {
        fetchBackups();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteBackup = async (id) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    try {
      await fetch(`/api/backups/${id}`, {
        method: 'DELETE',
        headers: { 
          'x-cms-pin-hash': pinHash,
          'x-cms-security-key-hash': securityKeyHash || ''
        }
      });
      fetchBackups();
    } catch {}
  };

  const restoreBackup = async (id) => {
    if (!window.confirm('WARNING: Restoring will overwrite all current live data with this snapshot. A safety snapshot of current data will be created just in case. Continue?')) return;
    try {
      const res = await fetch(`/api/backups/restore/${id}`, {
        method: 'POST',
        headers: { 
          'x-cms-pin-hash': pinHash,
          'x-cms-security-key-hash': securityKeyHash || ''
        }
      });
      if (res.ok) {
        alert('Site successfully restored! Please reload the page to see changes.');
        window.location.reload();
      }
    } catch {
      alert('Failed to restore backup.');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (!isUnlocked) {
    return (
      <div className="relative w-full h-[60vh] max-w-5xl mx-auto">
        <SecurityLockPanel onUnlock={() => setIsUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      <PageHeader
        title="Version History & Backups"
        subtitle="Create snapshots of your website data and roll back if you make a mistake."
        icon={History}
      />

      {/* AUTO BACKUP CONFIG INFO BAR */}
      <div className="mt-6 glass-panel p-4 rounded-2xl border border-admin-accent/30 bg-admin-accent/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-admin-accent/20 text-admin-accent-hi shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-admin-text flex items-center gap-2">
              Automated 3-Day Backups Active
              <span className="inline-flex items-center gap-1 text-[10px] bg-admin-accent/20 text-admin-accent-hi px-2 py-0.5 rounded-full font-mono font-semibold border border-admin-accent/30">
                <ShieldCheck className="w-3 h-3" /> Auto-Purge Active
              </span>
            </h4>
            <p className="text-xs text-admin-muted mt-0.5">
              The system automatically takes a snapshot every 3 days and maintains the 7 most recent backups (purging older snapshots automatically).
            </p>
          </div>
        </div>
        <div className="text-xs font-mono font-semibold px-3 py-1.5 rounded-xl bg-admin-surface text-admin-muted border border-white/10 shrink-0">
          Max Retention: 7 Snapshots
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-semibold text-admin-text">Available Snapshots ({backups.length}/7)</h2>
          <button
            onClick={createBackup}
            disabled={isCreating}
            className="flex items-center gap-2 px-4 py-2 bg-admin-accent hover:bg-admin-accent-hi text-white rounded-xl font-medium transition-colors shadow-lg disabled:opacity-50"
          >
            {isCreating ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Create New Snapshot
          </button>
        </div>

        {loading ? (
          <div className="text-admin-muted">Loading backups...</div>
        ) : backups.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-2xl flex flex-col items-center border border-white/5">
            <div className="w-16 h-16 rounded-full bg-admin-surface flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-admin-muted" />
            </div>
            <h3 className="text-lg font-medium text-admin-text mb-2">No Backups Yet</h3>
            <p className="text-admin-muted max-w-md mx-auto">
              Create a snapshot before making big changes to the site, so you can always roll back.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {backups.map((backup, idx) => {
              const isAuto = backup.id.startsWith('auto-');
              const isPreRestore = backup.id.startsWith('pre-restore-');

              return (
                <motion.div
                  key={backup.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${isPreRestore ? 'bg-amber-500/20 text-amber-500' : isAuto ? 'bg-cyan-500/20 text-cyan-400' : 'bg-admin-accent/20 text-admin-accent'}`}>
                        {isPreRestore ? <AlertTriangle className="w-6 h-6" /> : isAuto ? <Clock className="w-6 h-6" /> : <History className="w-6 h-6" />}
                      </div>
                      <div>
                        <h3 className="font-medium text-admin-text text-sm flex items-center gap-2">
                          {isPreRestore ? 'Safety Auto-Backup' : isAuto ? 'Auto 3-Day Snapshot' : 'Manual Snapshot'}
                        </h3>
                        <p className="text-xs text-admin-muted mt-0.5">
                          {new Date(backup.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-mono text-admin-muted bg-admin-surface px-2 py-1 rounded-md">
                      {formatSize(backup.size)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                    <button
                      onClick={() => restoreBackup(backup.id)}
                      className="flex-1 flex justify-center items-center gap-2 py-2 bg-admin-accent/10 hover:bg-admin-accent hover:text-white text-admin-accent rounded-xl text-sm font-medium transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </button>
                    <button
                      onClick={() => deleteBackup(backup.id)}
                      className="p-2 bg-admin-danger/10 hover:bg-admin-danger text-admin-danger hover:text-white rounded-xl transition-colors"
                      title="Delete Snapshot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
