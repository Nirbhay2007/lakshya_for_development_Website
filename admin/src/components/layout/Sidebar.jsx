import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
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
  FileSpreadsheet,
  Lock,
  History,
  Briefcase,
  Mail,
  FileText,
  Inbox
} from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import lakshyaLogo from '../../assets/lakshya.png';

export default function Sidebar({ isOpen, setIsOpen }) {
  const navigate = useNavigate();
  const logout = useAdminStore((state) => state.logout);
  const draftFlags = useAdminStore((state) => state.draftFlags);
  const unsavedSections = useAdminStore((state) => state.unsavedSections);

  const menuGroups = [
    {
      title: 'CORE',
      items: [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard, key: 'dashboard' },
        { name: 'Submissions Log', path: '/submissions', icon: Inbox, key: 'submissions' },
        { name: 'Donations Log', path: '/donations', icon: Heart, key: 'donations' }
      ]
    },
    {
      title: 'PAGES',
      items: [
        { name: 'Hero Slider', path: '/hero', icon: Sliders, key: 'hero' },
        { name: 'Events Ticker', path: '/events', icon: BellRing, key: 'events' },
        { name: 'About Section', path: '/about', icon: Leaf, key: 'about' },
        { name: 'Programmes', path: '/programmes', icon: FolderKanban, key: 'programmes' },
        { name: 'Impact Numbers', path: '/impact', icon: TrendingUp, key: 'impact' },
        { name: 'Gallery', path: '/gallery', icon: Image, key: 'gallery' },
        { name: 'Partners', path: '/partners', icon: Handshake, key: 'partners' },
        { name: 'Team', path: '/team', icon: Users, key: 'team' },
        { name: 'Contact', path: '/contact', icon: Phone, key: 'contact' },
        { name: 'Donate Page', path: '/donate', icon: Heart, key: 'donate' },
        { name: 'Careers Page', path: '/careers', icon: Briefcase, key: 'careers' },
        { name: 'Legal Pages', path: '/legal', icon: FileText, key: 'legal' }
      ]
    },
    {
      title: 'GLOBAL',
      items: [
        { name: 'Site Settings', path: '/settings', icon: Settings, key: 'settings' },
        { name: 'Media Library', path: '/media', icon: FolderOpen, key: 'media' },
        { name: 'Newsletter List', path: '/newsletter', icon: Mail, key: 'newsletter' },
        { name: 'Activity Log', path: '/activity', icon: FileSpreadsheet, key: 'activity' },
        { name: 'Backups', path: '/backups', icon: History, key: 'backups' },
        { name: 'Security & Role Access', path: '/security', icon: Lock, key: 'security' }
      ]
    }
  ];

  const role = useAdminStore((state) => state.role || 'superadmin');

  const visibleGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (role === 'superadmin') return true;
      if (role === 'editor') {
        return ['hero', 'events', 'about', 'programmes', 'impact', 'gallery', 'partners', 'team', 'contact', 'careers', 'legal', 'media'].includes(item.key);
      }
      if (role === 'finance') {
        return ['dashboard', 'submissions', 'donations', 'newsletter'].includes(item.key);
      }
      return true;
    })
  })).filter(group => group.items.length > 0);

  const handleLock = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`w-[260px] h-screen fixed top-0 left-0 bg-admin-surface border-r border-admin-border flex flex-col z-40 select-none overflow-y-auto transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Brand Header */}
        <div className="h-16 border-b border-admin-border px-6 flex items-center gap-2.5 shrink-0">
          <img src={lakshyaLogo} alt="Lakshya Logo" className="w-6 h-6 object-contain" />
          <div>
            <span className="font-bold text-admin-text tracking-wide text-sm block">LAKSHYA CMS</span>
            <span className="text-[10px] text-admin-muted uppercase tracking-wider block -mt-1 font-semibold">Admin Portal</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-4 py-6 space-y-6">
          {visibleGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-admin-muted tracking-wider uppercase block mb-2">
                {group.title}
              </span>
              <div className="space-y-0.5">
                {group.items.map((item, iIdx) => {
                  const isDraft = draftFlags[item.key];
                  const isUnsaved = unsavedSections[item.key];

                  return (
                    <NavLink
                      key={iIdx}
                      to={item.path}
                      end={item.path === '/'}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                      `relative flex items-center justify-between px-3 py-2 text-sm rounded-xl transition-all duration-200 group border border-transparent ${
                        isActive
                          ? 'bg-forest-500/15 border-forest-500/30 text-admin-accent-hi font-semibold'
                          : 'text-admin-text/70 hover:text-admin-text hover:bg-white/5'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-2.5">
                          <item.icon className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                            isActive ? 'text-admin-accent-hi' : 'text-admin-muted group-hover:text-admin-text'
                          }`} />
                          <span>{item.name}</span>
                        </div>

                        {/* Status Badges */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUnsaved && (
                            <span className="w-2 h-2 rounded-full bg-admin-danger" title="Unsaved changes in page" />
                          )}
                          {isDraft && !isUnsaved && (
                            <span className="w-2 h-2 rounded-full bg-admin-amber" title="Saved draft (unpublished)" />
                          )}
                        </div>

                        {/* Hover Overlay */}
                        {!isActive && (
                          <motion.div
                            className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-[-1]"
                            layoutId={`sidebar-hover-${gIdx}-${iIdx}`}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Lock Portal Bottom Actions */}
      <div className="p-4 border-t border-admin-border bg-black/20 mt-auto shrink-0">
        <div className="mb-3 px-1 flex items-center justify-between">
          <span className="text-[11px] text-admin-muted font-medium">Role:</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            role === 'superadmin'
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              : role === 'finance'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {role === 'superadmin' ? 'Super Admin' : role === 'finance' ? 'Finance' : 'Editor'}
          </span>
        </div>
        <button
          onClick={handleLock}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-admin-border bg-admin-surface hover:bg-admin-surface-2 text-admin-danger hover:border-admin-danger/30 transition-all font-medium text-xs uppercase tracking-wider cursor-pointer"
        >
          <Lock className="w-4 h-4 text-admin-danger shrink-0" />
          <span>Lock Portal</span>
        </button>
      </div>
    </aside>
    </>
  );
}
