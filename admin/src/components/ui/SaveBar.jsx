import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SaveBar({ isDirty, onSave, onDiscard, sectionName = 'this section', isSaving = false }) {
  
  // Register Cmd/Ctrl + S keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) {
          onSave();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDirty, isSaving, onSave]);

  return (
    <AnimatePresence>
      {isDirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-6 right-6 md:left-[286px] z-40 bg-admin-surface-2/95 border border-admin-accent/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-admin-amber animate-pulse" />
            <span className="text-sm font-medium text-admin-text">
              You have unsaved changes in <strong className="text-admin-accent-hi capitalize">{sectionName}</strong>
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onDiscard}
              disabled={isSaving}
              className="admin-btn-secondary py-2 text-xs"
            >
              Discard
            </button>
            <button
              onClick={onSave}
              disabled={isSaving}
              className="admin-btn-primary py-2 text-xs font-semibold"
            >
              {isSaving ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
