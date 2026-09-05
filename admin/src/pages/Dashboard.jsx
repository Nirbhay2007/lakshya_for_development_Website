import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  BellRing,
  Leaf,
  FolderKanban,
  TrendingUp,
  Image,
  Handshake,
  Users,
  Phone,
  Heart,
  Settings,
  FolderOpen,
  PlusCircle,
  CloudUpload,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useAdminStore } from '../store/useAdminStore';
import CMSBadge from '../components/ui/CMSBadge';
import CMSModal from '../components/ui/CMSModal';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const draftFlags = useAdminStore((state) => state.draftFlags);
  const publishAll = useAdminStore((state) => state.publishAll);
  const logs = useAdminStore((state) => state.logs);
  const mediaFiles = useAdminStore((state) => state.mediaFiles);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Dynamic values
  const draftKeys = Object.keys(draftFlags).filter((key) => draftFlags[key]);
  const draftCount = draftKeys.length;
  
  // Find last publish log
  const publishLog = logs.find(log => log.action === 'Published');
  const lastPublishedStr = publishLog 
    ? `${formatDistanceToNow(new Date(publishLog.timestamp))} ago` 
    : 'Never';

  // Section list
  const sections = [
    { name: 'Hero Slider', key: 'hero', path: '/hero', icon: Sliders },
    { name: 'Events Ticker', key: 'events', path: '/events', icon: BellRing },
    { name: 'About Section', key: 'about', path: '/about', icon: Leaf },
    { name: 'Programmes', key: 'programmes', path: '/programmes', icon: FolderKanban },
    { name: 'Impact Numbers', key: 'impact', path: '/impact', icon: TrendingUp },
    { name: 'Gallery', key: 'gallery', path: '/gallery', icon: Image },
    { name: 'Partners', key: 'partners', path: '/partners', icon: Handshake },
    { name: 'Team Grid', key: 'team', path: '/team', icon: Users },
    { name: 'Contact Settings', key: 'contact', path: '/contact', icon: Phone },
    { name: 'Donate Page', key: 'donate', path: '/donate', icon: Heart },
    { name: 'Site Settings', key: 'settings', path: '/settings', icon: Settings },
    { name: 'Media Library', key: 'media', path: '/media', icon: FolderOpen }
  ];

  // Helper to get last edit details for a section
  const getSectionEditDetails = (sectionKey) => {
    const sectionLogs = logs.filter(log => log.section === sectionKey);
    if (sectionLogs.length > 0) {
      return `${formatDistanceToNow(new Date(sectionLogs[0].timestamp))} ago`;
    }
    return 'Initial';
  };

  const handlePublishConfirm = () => {
    publishAll();
    setIsPublishModalOpen(false);
  };

  const exportAllJSON = () => {
    navigate('/settings'); // Settings has JSON export capabilities
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-2xl glass-panel p-6 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border border-admin-accent/20">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-admin-accent/5 blur-3xl pointer-events-none" />
        
        <div>
          <h2 className="text-xl font-bold text-admin-text">Good morning, Lakshya Team 🌿</h2>
          <p className="text-xs text-admin-muted mt-1">
            Last published: {lastPublishedStr}
          </p>
        </div>
        
        {draftCount > 0 ? (
          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-admin-accent hover:bg-green-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg transition-all"
          >
            <CloudUpload className="w-4 h-4 shrink-0" />
            <span>Publish {draftCount} Changes</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-semibold">
            <CheckCircle2Icon className="w-4 h-4 shrink-0" />
            <span>All Sections Live</span>
          </div>
        )}
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sections', value: '11', icon: Layers, color: 'text-blue-400' },
          { label: 'Media Files', value: mediaFiles.length, icon: Image, color: 'text-purple-400' },
          { label: 'Pending Changes', value: draftCount, icon: CloudUpload, color: draftCount > 0 ? 'text-admin-amber' : 'text-admin-muted' },
          { label: 'Last Published', value: publishLog ? formatDistanceToNow(new Date(publishLog.timestamp)) : 'Never', icon: Calendar, color: 'text-green-400' }
        ].map((stat, idx) => (
          <div key={idx} className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
            <div>
              <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">{stat.label}</span>
              <span className="text-2xl font-bold text-admin-text block mt-1">{stat.value}</span>
            </div>
            <div className={`p-2.5 rounded-xl bg-white/5 border border-white/10 ${stat.color} shrink-0`}>
              <stat.icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Section Health Grid */}
      <div>
        <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider mb-4 block">Section Status Grid</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section, idx) => {
            const isDraft = draftFlags[section.key];
            const editTime = getSectionEditDetails(section.key);

            return (
              <div
                key={idx}
                onClick={() => navigate(section.path)}
                className="group glass-panel rounded-2xl p-4 border border-white/[0.04] hover:border-admin-accent/30 hover:bg-admin-surface-2/60 cursor-pointer transition-all duration-200 flex flex-col justify-between h-36"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-admin-accent-hi group-hover:bg-admin-accent/10 transition-colors shrink-0">
                      <section.icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm text-admin-text group-hover:text-admin-accent-hi transition-colors">
                      {section.name}
                    </span>
                  </div>
                  
                  <CMSBadge variant={isDraft ? 'warning' : 'success'}>
                    {isDraft ? 'Draft' : 'Live'}
                  </CMSBadge>
                </div>

                <div className="flex items-center justify-between border-t border-admin-border pt-3 mt-4">
                  <span className="text-[10px] text-admin-muted">
                    Edited: <strong className="text-admin-text/70">{editTime}</strong>
                  </span>
                  <span className="text-[10px] font-semibold text-admin-accent-hi flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>Edit</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions & Recent Activity layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider block">Recent Activity Log</h3>
          <div className="glass-panel rounded-2xl border border-white/[0.04] divide-y divide-admin-border overflow-hidden">
            {logs.slice(0, 5).length > 0 ? (
              logs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="p-4 flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
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
                        className="scale-90"
                      >
                        {log.action}
                      </CMSBadge>
                      <span className="font-semibold text-admin-text capitalize">
                        {log.section.replace('-', ' ')}
                      </span>
                    </div>
                    <p className="text-admin-muted">{log.description}</p>
                  </div>
                  <span className="text-[10px] text-admin-muted shrink-0 font-mono">
                    {formatDistanceToNow(new Date(log.timestamp))} ago
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-admin-muted text-xs">
                No activity logs recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider block">Quick Actions</h3>
          <div className="glass-panel rounded-2xl p-4 border border-white/[0.04] space-y-2.5">
             <button
              onClick={() => navigate('/programmes')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left"
            >
              <span>Manage Programmes</span>
              <PlusCircle className="w-4 h-4 text-admin-accent-hi" />
            </button>
            <button
              onClick={() => navigate('/gallery')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left"
            >
              <span>Upload Gallery Images</span>
              <PlusCircle className="w-4 h-4 text-admin-accent-hi" />
            </button>
            <button
              onClick={() => navigate('/team')}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left"
            >
              <span>Add Team Member</span>
              <PlusCircle className="w-4 h-4 text-admin-accent-hi" />
            </button>
            <button
              onClick={exportAllJSON}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left"
            >
              <span>Export All JSON Data</span>
              <ArrowRight className="w-4 h-4 text-admin-accent-hi" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <CMSModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title="Confirm Publish Changes"
        actions={
          <>
            <button
              onClick={() => setIsPublishModalOpen(false)}
              className="admin-btn-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handlePublishConfirm}
              className="admin-btn-primary py-1.5 text-xs"
            >
              Confirm and Publish
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p>
            This will push {draftCount} draft changes live to the visitor experience. Are you sure you want to proceed?
          </p>
          <p className="text-xs text-admin-muted">
            The status tags of modified items will change to green (Live).
          </p>
        </div>
      </CMSModal>
    </div>
  );
}

// Custom simple check icon replacement for check circle to avoid module resolution warning
function CheckCircle2Icon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
