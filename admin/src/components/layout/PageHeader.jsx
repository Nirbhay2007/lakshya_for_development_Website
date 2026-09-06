import React, { useState } from 'react';
import { History } from 'lucide-react';
import RevisionDrawer from '../ui/RevisionDrawer';

export default function PageHeader({ title, description, actions, sectionKey, onRollback }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-admin-border mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-admin-text">{title}</h1>
          {description && <p className="text-sm text-admin-muted mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {sectionKey && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-admin-surface border border-admin-border hover:border-admin-accent/50 text-admin-muted hover:text-admin-accent-hi text-xs font-semibold rounded-xl transition-all shadow-sm cursor-pointer"
              title={`View ${sectionKey} version history & restore previous versions`}
            >
              <History className="w-3.5 h-3.5 text-admin-accent-hi" />
              <span>Version History</span>
            </button>
          )}
          {actions}
        </div>
      </div>

      {sectionKey && (
        <RevisionDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sectionKey={sectionKey}
          onRollbackSuccess={onRollback}
        />
      )}
    </>
  );
}
