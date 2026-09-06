import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Tablet, Smartphone, RotateCw, ExternalLink, X, Globe } from 'lucide-react';

export default function LivePreviewModal({ isOpen, onClose, initialPath = '/' }) {
  const [device, setDevice] = useState('desktop'); // 'desktop' | 'tablet' | 'mobile'
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [key, setKey] = useState(0);

  if (!isOpen) return null;

  const routes = [
    { label: 'Home Page', path: '/' },
    { label: 'About Us', path: '/about' },
    { label: 'Programmes', path: '/programmes' },
    { label: 'Gallery', path: '/gallery' },
    { label: 'Donate Page', path: '/donate' },
    { label: 'Contact Us', path: '/contact' },
    { label: 'Careers', path: '/careers' },
    { label: 'Legal & 80G', path: '/legal' }
  ];

  const handleRefresh = () => {
    setKey(prev => prev + 1);
  };

  const getDeviceFrameClass = () => {
    switch (device) {
      case 'mobile':
        return 'w-[375px] h-[667px] max-h-[85vh] rounded-[36px] border-[10px] border-admin-surface shadow-2xl overflow-hidden';
      case 'tablet':
        return 'w-[768px] h-[85vh] rounded-[24px] border-[8px] border-admin-surface shadow-2xl overflow-hidden';
      case 'desktop':
      default:
        return 'w-full h-full rounded-xl border border-admin-border shadow-xl overflow-hidden';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md">
        {/* Top Control Bar */}
        <header className="h-14 bg-admin-surface border-b border-admin-border px-4 flex items-center justify-between gap-4 select-none shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-admin-text font-bold text-sm">
              <Globe className="w-4 h-4 text-admin-accent-hi" />
              <span>Live Website Preview</span>
            </div>

            {/* Route Selector Dropdown */}
            <select
              value={currentPath}
              onChange={(e) => {
                setCurrentPath(e.target.value);
                setKey(k => k + 1);
              }}
              className="bg-admin-bg border border-admin-border rounded-lg text-xs text-admin-text px-2.5 py-1.5 focus:outline-none focus:border-admin-accent cursor-pointer"
            >
              {routes.map(r => (
                <option key={r.path} value={r.path}>
                  {r.label} ({r.path})
                </option>
              ))}
            </select>
          </div>

          {/* Device Switcher */}
          <div className="flex items-center gap-1 bg-admin-bg p-1 rounded-lg border border-admin-border">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                device === 'desktop'
                  ? 'bg-admin-accent text-white shadow-sm'
                  : 'text-admin-muted hover:text-admin-text'
              }`}
              title="Desktop View (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice('tablet')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                device === 'tablet'
                  ? 'bg-admin-accent text-white shadow-sm'
                  : 'text-admin-muted hover:text-admin-text'
              }`}
              title="Tablet View (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tablet</span>
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                device === 'mobile'
                  ? 'bg-admin-accent text-white shadow-sm'
                  : 'text-admin-muted hover:text-admin-text'
              }`}
              title="Mobile View (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 text-admin-muted hover:text-admin-text hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Reload preview"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <a
              href={currentPath}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-admin-muted hover:text-admin-text hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-admin-muted hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer ml-1"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Viewport Frame Container */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-950/60">
          <div className={`transition-all duration-300 flex flex-col bg-white ${getDeviceFrameClass()}`}>
            <iframe
              key={`${currentPath}-${key}`}
              src={currentPath}
              title="Website Live Preview"
              className="w-full h-full border-0 bg-white"
            />
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
