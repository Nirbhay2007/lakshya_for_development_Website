import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Briefcase,
  FileText,
  Inbox,
  Mail,
  Lock,
  History,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  ShieldCheck,
  Download,
  AlertCircle
} from 'lucide-react';
import { useAdminStore } from '../store/useAdminStore';
import CMSBadge from '../components/ui/CMSBadge';
import CMSModal from '../components/ui/CMSModal';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const role = useAdminStore((state) => state.role || 'superadmin');
  const draftFlags = useAdminStore((state) => state.draftFlags);
  const publishAll = useAdminStore((state) => state.publishAll);
  const logs = useAdminStore((state) => state.logs);
  const mediaFiles = useAdminStore((state) => state.mediaFiles);
  const token = useAdminStore((state) => state.token);
  const pinHash = useAdminStore((state) => state.pinHash);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [donationStats, setDonationStats] = useState({
    totalAmount: 0,
    totalCount: 0,
    monthlyAmount: 0,
    claimed80gCount: 0
  });
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [subscribersCount, setSubscribersCount] = useState(0);

  // Fetch financial & submission metrics for Finance and Superadmin
  useEffect(() => {
    if (role === 'finance' || role === 'superadmin') {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (pinHash) headers['x-cms-pin-hash'] = pinHash;

      // 1. Donation stats
      fetch('/api/donations/stats', { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.stats) {
            setDonationStats(data.stats);
          }
        })
        .catch((err) => console.warn('Donations stats fetch error:', err));

      // 2. Submissions count
      fetch('/api/submissions', { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.submissions)) {
            setSubmissionsCount(data.submissions.length);
          }
        })
        .catch(() => {});

      // 3. Newsletter subscribers
      fetch('/api/subscribers', { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.subscribers)) {
            setSubscribersCount(data.subscribers.length);
          }
        })
        .catch(() => {});
    }
  }, [role, token, pinHash]);

  // Draft counts for CMS
  const draftKeys = Object.keys(draftFlags).filter((key) => draftFlags[key]);
  const draftCount = draftKeys.length;
  
  // Find last publish log
  const publishLog = logs.find((log) => log.action === 'Published');
  const lastPublishedStr = publishLog 
    ? `${formatDistanceToNow(new Date(publishLog.timestamp))} ago` 
    : 'Never';

  // Helper to get last edit details for a section
  const getSectionEditDetails = (sectionKey) => {
    const sectionLogs = logs.filter((log) => log.section === sectionKey);
    if (sectionLogs.length > 0) {
      return `${formatDistanceToNow(new Date(sectionLogs[0].timestamp))} ago`;
    }
    return 'Initial';
  };

  const handlePublishConfirm = () => {
    publishAll();
    setIsPublishModalOpen(false);
  };

  // -------------------------------------------------------------
  // ROLE CONFIGURATION & FILTERING
  // -------------------------------------------------------------

  // All possible sections
  const allCmsSections = [
    { name: 'Hero Slider', key: 'hero', path: '/hero', icon: Sliders, desc: 'Homepage banner slides and messaging' },
    { name: 'Events Ticker', key: 'events', path: '/events', icon: BellRing, desc: 'Upcoming workshops and notification ticker' },
    { name: 'About Section', key: 'about', path: '/about', icon: Leaf, desc: 'Mission, vision, and organizational values' },
    { name: 'Programmes', key: 'programmes', path: '/programmes', icon: FolderKanban, desc: 'Education, health, and relief initiatives' },
    { name: 'Impact Numbers', key: 'impact', path: '/impact', icon: TrendingUp, desc: 'Live stats, metric counters, and milestones' },
    { name: 'Gallery', key: 'gallery', path: '/gallery', icon: Image, desc: 'Photo gallery, media albums, and captions' },
    { name: 'Partners', key: 'partners', path: '/partners', icon: Handshake, desc: 'Corporate sponsors and NGO alliances' },
    { name: 'Team Grid', key: 'team', path: '/team', icon: Users, desc: 'Trustees, directors, and field leadership' },
    { name: 'Contact Page', key: 'contact', path: '/contact', icon: Phone, desc: 'Branch offices, helpline numbers, and map' },
    { name: 'Careers Page', key: 'careers', path: '/careers', icon: Briefcase, desc: 'Job openings and internship positions' },
    { name: 'Legal Pages', key: 'legal', path: '/legal', icon: FileText, desc: 'Privacy policy, FCRA disclosure, and terms' },
    { name: 'Media Library', key: 'media', path: '/media', icon: FolderOpen, desc: 'Optimized WebP assets and graphic uploads' }
  ];

  const financeSections = [
    { 
      name: 'Donations & Ledger', 
      key: 'donations', 
      path: '/donations', 
      icon: Heart, 
      desc: 'Verify incoming funds, transaction IDs, and donor receipts',
      badge: 'Live Ledger'
    },
    { 
      name: '80G Tax Certificates', 
      key: 'receipts', 
      path: '/donations', 
      icon: FileSpreadsheet, 
      desc: 'Generate & download branded Form 10BE tax receipts (PDF)',
      badge: '80G Exemption'
    },
    { 
      name: 'Form 10BD Tax Filing', 
      key: 'form10bd', 
      path: '/donations', 
      icon: FileText, 
      desc: 'Export annual donor records for the Income Tax Department',
      badge: 'ITD Compliant'
    },
    { 
      name: 'Donor Inquiries & Leads', 
      key: 'submissions', 
      path: '/submissions', 
      icon: Inbox, 
      desc: 'Review sponsorship inquiries, queries, and contacts',
      badge: `${submissionsCount} Records`
    },
    { 
      name: 'Newsletter Subscribers', 
      key: 'newsletter', 
      path: '/newsletter', 
      icon: Mail, 
      desc: 'Export verified supporter email addresses',
      badge: `${subscribersCount} Active`
    }
  ];

  const superadminExtraSections = [
    { 
      name: 'Donations & Ledger', 
      key: 'donations', 
      path: '/donations', 
      icon: Heart, 
      desc: 'Financial ledger, 80G receipts, and Form 10BD export' 
    },
    { 
      name: 'Site Settings & SEO', 
      key: 'settings', 
      path: '/settings', 
      icon: Settings, 
      desc: 'Global metadata, payment gateways, and security keys' 
    },
    { 
      name: 'Security & Role Access', 
      key: 'security', 
      path: '/security', 
      icon: Lock, 
      desc: 'Manage staff role PIN passcodes and master recovery keys' 
    },
    { 
      name: 'System Backups', 
      key: 'backups', 
      path: '/backups', 
      icon: History, 
      desc: 'Disaster recovery zip exports and SQLite snapshot restores' 
    }
  ];

  // Pick visible module cards based on role
  let displaySections = [];
  if (role === 'finance') {
    displaySections = financeSections;
  } else if (role === 'editor') {
    displaySections = allCmsSections;
  } else {
    // superadmin: CMS sections + administrative modules
    displaySections = [...allCmsSections, ...superadminExtraSections];
  }

  // Filter logs per role
  const roleFilteredLogs = logs.filter((log) => {
    if (role === 'superadmin') return true;
    if (role === 'finance') {
      return log.section === 'Donations' || log.section === 'Submissions' || log.section === 'Newsletter';
    }
    if (role === 'editor') {
      return log.section !== 'Security' && log.section !== 'Backups' && log.section !== 'Auth' && log.section !== 'Donations';
    }
    return true;
  });

  return (
    <div className="space-y-8 font-sans text-left">
      {/* 1. ROLE-TAILORED WELCOME BANNER */}
      <div className="relative rounded-2xl glass-panel p-6 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 border border-admin-accent/20">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-admin-accent/5 blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-admin-text">
              {role === 'finance'
                ? 'Good morning, Finance & Compliance Officer 💼'
                : role === 'editor'
                ? 'Good morning, Content Editor ✍️'
                : 'Good morning, Super Administrator 🛡️'}
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              role === 'superadmin'
                ? 'bg-admin-accent/20 text-admin-accent-hi border border-admin-accent/30'
                : role === 'editor'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}>
              {role}
            </span>
          </div>

          <p className="text-xs text-admin-muted mt-1.5 max-w-xl">
            {role === 'finance'
              ? 'Review financial contributions, issue verified 80G tax certificates, and export Form 10BD records for annual Income Tax filing.'
              : role === 'editor'
              ? 'Publish stories, update events, upload media photos, and manage programme impact across the public website.'
              : `Total operational control. All CMS drafts, financial ledger entries, and role PIN passcodes are actively synchronized.`}
          </p>
        </div>
        
        {/* Banner CTA */}
        {role === 'finance' ? (
          <button
            onClick={() => navigate('/donations')}
            className="flex items-center gap-1.5 px-4 py-2 bg-admin-accent hover:bg-admin-accent-hi text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export Form 10BD (CSV)</span>
          </button>
        ) : draftCount > 0 ? (
          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-admin-accent hover:bg-green-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg transition-all shrink-0"
          >
            <CloudUpload className="w-4 h-4" />
            <span>Publish {draftCount} Changes</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-semibold shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>All Sections Live</span>
          </div>
        )}
      </div>

      {/* 2. ROLE-BASED QUICK STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {role === 'finance' ? (
          <>
            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
              <div>
                <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">Total Raised</span>
                <span className="text-xl font-bold text-admin-text block mt-1 font-display">
                  ₹{Number(donationStats.totalAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-forest-500/15 border border-forest-500/30 text-forest-400 shrink-0">
                <Heart className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
              <div>
                <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">80G Tax Claims</span>
                <span className="text-2xl font-bold text-admin-text block mt-1 font-display">
                  {donationStats.claimed80gCount || 0}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
              <div>
                <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">Monthly Donors</span>
                <span className="text-2xl font-bold text-admin-text block mt-1 font-display">
                  ₹{Number(donationStats.monthlyAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
              <div>
                <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">Subscribers</span>
                <span className="text-2xl font-bold text-admin-text block mt-1 font-display">
                  {subscribersCount}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0">
                <Mail className="w-5 h-5" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
              <div>
                <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">Total Sections</span>
                <span className="text-2xl font-bold text-admin-text block mt-1 font-display">12</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
              <div>
                <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">Media Files</span>
                <span className="text-2xl font-bold text-admin-text block mt-1 font-display">{mediaFiles.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
                <Image className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
              <div>
                <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">Pending Drafts</span>
                <span className={`text-2xl font-bold block mt-1 font-display ${draftCount > 0 ? 'text-admin-amber' : 'text-admin-text'}`}>
                  {draftCount}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
                <CloudUpload className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/[0.04]">
              <div>
                <span className="text-[10px] font-bold text-admin-muted uppercase tracking-wider block">Last Published</span>
                <span className="text-xs font-semibold text-admin-text block mt-2 font-mono truncate">
                  {lastPublishedStr}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. ROLE-PERMITTED MODULES / SECTION HEALTH GRID */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider block">
            {role === 'finance' ? 'Finance & Compliance Modules' : 'Authorized Content Sections'}
          </h3>
          <span className="text-[11px] text-admin-muted font-medium">
            Showing {displaySections.length} accessible areas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displaySections.map((section, idx) => {
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
                    <div>
                      <span className="font-semibold text-sm text-admin-text group-hover:text-admin-accent-hi transition-colors block">
                        {section.name}
                      </span>
                      <p className="text-[11px] text-admin-muted line-clamp-1 mt-0.5">
                        {section.desc}
                      </p>
                    </div>
                  </div>
                  
                  {section.badge ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-admin-accent/15 text-admin-accent-hi border border-admin-accent/25 shrink-0">
                      {section.badge}
                    </span>
                  ) : (
                    <CMSBadge variant={isDraft ? 'warning' : 'success'}>
                      {isDraft ? 'Draft' : 'Live'}
                    </CMSBadge>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-admin-border pt-3 mt-4">
                  <span className="text-[10px] text-admin-muted">
                    {role === 'finance' ? (
                      <span className="text-admin-accent-hi font-medium">Click to open</span>
                    ) : (
                      <>Edited: <strong className="text-admin-text/70">{editTime}</strong></>
                    )}
                  </span>
                  <span className="text-[10px] font-semibold text-admin-accent-hi flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    <span>{role === 'finance' ? 'Manage' : 'Edit'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. QUICK ACTIONS & RECENT ACTIVITY LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider block">
            {role === 'finance' ? 'Finance & Inquiries Audit Log' : 'Recent Activity Log'}
          </h3>
          <div className="glass-panel rounded-2xl border border-white/[0.04] divide-y divide-admin-border overflow-hidden">
            {roleFilteredLogs.slice(0, 5).length > 0 ? (
              roleFilteredLogs.slice(0, 5).map((log, idx) => (
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
                        {log.section?.replace('-', ' ')}
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

        {/* Role-Specific Quick Actions Card */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider block">Authorized Quick Actions</h3>
          <div className="glass-panel rounded-2xl p-4 border border-white/[0.04] space-y-2.5">
            {role === 'finance' ? (
              <>
                <button
                  onClick={() => navigate('/donations')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Open Donations Ledger</span>
                  <Heart className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/donations')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Export Form 10BD for Tax</span>
                  <Download className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/submissions')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Review Donor Leads</span>
                  <Inbox className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/newsletter')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>View Newsletter List</span>
                  <Mail className="w-4 h-4 text-admin-accent-hi" />
                </button>
              </>
            ) : role === 'editor' ? (
              <>
                <button
                  onClick={() => navigate('/programmes')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Manage Programmes</span>
                  <PlusCircle className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/media')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Upload Media Assets</span>
                  <FolderOpen className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/events')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Update Events Ticker</span>
                  <BellRing className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/submissions')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Check Volunteer Apps</span>
                  <Inbox className="w-4 h-4 text-admin-accent-hi" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/programmes')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Manage Programmes</span>
                  <PlusCircle className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/donations')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>View Donations Ledger</span>
                  <Heart className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/security')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>Manage Roles & Passwords</span>
                  <Lock className="w-4 h-4 text-admin-accent-hi" />
                </button>
                <button
                  onClick={() => navigate('/backups')}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-semibold text-admin-text transition-all text-left cursor-pointer"
                >
                  <span>System Backups & Recovery</span>
                  <History className="w-4 h-4 text-admin-accent-hi" />
                </button>
              </>
            )}
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
              className="admin-btn-secondary py-1.5 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePublishConfirm}
              className="admin-btn-primary py-1.5 text-xs cursor-pointer"
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
