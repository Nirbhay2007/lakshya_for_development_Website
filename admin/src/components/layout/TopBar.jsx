import React, { useState } from 'react';
import { CloudUpload, Globe, Menu, CheckCircle2 } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import CMSModal from '../ui/CMSModal';
import LivePreviewModal from '../ui/LivePreviewModal';

export default function TopBar({ onMenuClick }) {
  const publishAll = useAdminStore((state) => state.publishAll);
  const draftFlags = useAdminStore((state) => state.draftFlags);
  const role = useAdminStore((state) => state.role || 'superadmin');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Count active drafts
  const draftKeys = Object.keys(draftFlags).filter((key) => draftFlags[key]);
  const draftCount = draftKeys.length;

  const handlePublishConfirm = () => {
    publishAll();
    setIsPublishModalOpen(false);
  };

  return (
    <>
      <header className="h-[56px] fixed top-0 right-0 left-0 md:left-[260px] bg-admin-surface/80 border-b border-admin-border backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-20 select-none">
        {/* Mobile Menu Toggle & Status Indicators */}
        <div className="flex items-center gap-2">
          <button 
            className="md:hidden p-1.5 -ml-2 text-admin-muted hover:text-admin-text hover:bg-white/5 rounded-lg transition-colors"
            onClick={onMenuClick}
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {draftCount > 0 ? (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-admin-amber/10 border border-admin-amber/20 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-admin-amber animate-pulse" />
              <span className="text-[11px] font-semibold text-admin-amber font-sans hidden sm:inline">
                {draftCount} {draftCount === 1 ? 'Section' : 'Sections'} with unpublished drafts
              </span>
              <span className="text-[11px] font-semibold text-admin-amber font-sans sm:hidden">
                {draftCount} Drafts
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2.5 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[11px] font-semibold text-green-400 font-sans hidden sm:inline">
                All sections live
              </span>
              <span className="text-[11px] font-semibold text-green-400 font-sans sm:hidden">
                Live
              </span>
            </div>
          )}
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-3">
          {/* Live Visual Preview Button */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-admin-border bg-admin-surface hover:bg-white/5 text-xs text-admin-text/90 transition-all font-semibold cursor-pointer shadow-sm hover:border-admin-accent"
          >
            <Globe className="w-3.5 h-3.5 text-admin-accent-hi" />
            <span className="hidden sm:inline">Live Preview</span>
            <span className="sm:hidden">Preview</span>
          </button>

          {/* Publish Action (Super Admin & Editor only) */}
          {role !== 'finance' && (
            <button
              onClick={() => setIsPublishModalOpen(true)}
              disabled={draftCount === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                draftCount > 0
                  ? 'bg-admin-accent border-transparent text-white hover:bg-green-700 shadow-md cursor-pointer'
                  : 'bg-white/5 border-admin-border text-admin-muted cursor-not-allowed'
              }`}
            >
              <CloudUpload className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Publish All</span>
              <span className="sm:hidden">Publish</span>
            </button>
          )}
        </div>
      </header>

      {/* Live Preview Modal */}
      <LivePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        initialPath="/"
      />

      {/* Confirmation Modal */}
      <CMSModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title="Confirm Publish All Changes"
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
            You are about to publish all local drafts to the live application database. This will update the status of the following sections:
          </p>
          <ul className="list-disc pl-5 font-medium text-admin-accent-hi capitalize space-y-1">
            {draftKeys.map((k) => (
              <li key={k}>{k.replace('-', ' ')}</li>
            ))}
          </ul>
          <p className="text-xs text-admin-muted">
            Note: In production environments, this clears the draft indicator banners.
          </p>
        </div>
      </CMSModal>
    </>
  );
}
