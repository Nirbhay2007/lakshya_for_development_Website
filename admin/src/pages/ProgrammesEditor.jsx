import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSDragList from '../components/ui/CMSDragList';
import CMSInput from '../components/ui/CMSInput';
import CMSTextarea from '../components/ui/CMSTextarea';
import CMSToggle from '../components/ui/CMSToggle';
import CMSColorPicker from '../components/ui/CMSColorPicker';
import CMSImageUpload from '../components/ui/CMSImageUpload';
import CMSModal from '../components/ui/CMSModal';
import CMSBadge from '../components/ui/CMSBadge';
import { Plus, Trash2, X, ChevronRight } from 'lucide-react';

export default function ProgrammesEditor() {
  const [data, setData] = useState(null); // data is the array of programmes directly
  const [isDirty, setIsDirty] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('programmes');
    setData(Array.isArray(loaded) ? loaded : []);
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('programmes', true);
  };

  const handleSave = () => {
    saveSection('programmes', data);
    setIsDirty(false);
    setSectionDirty('programmes', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('programmes');
    setData(Array.isArray(loaded) ? loaded : []);
    setIsDirty(false);
    setSectionDirty('programmes', false);
    setEditingId(null);
  };

  // Find active edit item
  const editingItem = data?.find(item => item.id === editingId) || null;

  const handleItemChange = (id, field, value) => {
    const updated = data.map((item) => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Auto-slug / id generation from title
        if (field === 'title' && !item.customSlugHandled) {
          updatedItem.id = value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        }
        return updatedItem;
      }
      return item;
    });
    triggerChange(updated);
  };

  const handleParagraphChange = (itemId, index, value) => {
    const updated = data.map((item) => {
      if (item.id === itemId) {
        const paragraphs = [...(item.paragraphs || [])];
        paragraphs[index] = value;
        return { ...item, paragraphs };
      }
      return item;
    });
    triggerChange(updated);
  };

  const addParagraph = (itemId) => {
    const updated = data.map((item) => {
      if (item.id === itemId) {
        const paragraphs = [...(item.paragraphs || []), ''];
        return { ...item, paragraphs };
      }
      return item;
    });
    triggerChange(updated);
  };

  const deleteParagraph = (itemId, index) => {
    const updated = data.map((item) => {
      if (item.id === itemId) {
        const paragraphs = (item.paragraphs || []).filter((_, i) => i !== index);
        return { ...item, paragraphs };
      }
      return item;
    });
    triggerChange(updated);
  };

  const handleReorder = (newItems) => {
    triggerChange(newItems);
  };

  const addProgramme = () => {
    const newId = `prog_${Date.now()}`;
    const newProgramme = {
      id: newId,
      title: 'New Programme Name',
      eyebrow: 'Quality Education',
      heading: 'Providing support to local communities',
      accentColor: '#2e7d32',
      gradientFrom: '#1b5e20',
      gradientTo: '#4caf50',
      stat: '1,000+ Kids',
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=600&auto=format&fit=crop',
      description: 'Add a short description suitable for displaying on the home page card layout.',
      paragraphs: [
        'Add paragraphs detail text blocks here.'
      ],
      active: true,
      customSlugHandled: false
    };
    triggerChange([...data, newProgramme]);
    setEditingId(newId);
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const deleteProgramme = () => {
    const filtered = data.filter((item) => item.id !== deleteConfirmId);
    triggerChange(filtered);
    setDeleteConfirmId(null);
    if (editingId === deleteConfirmId) {
      setEditingId(null);
    }
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading programmes...</div>;

  return (
    <div className="space-y-6 relative">
      <PageHeader
        title="Programmes Editor"
        description="Add, edit, reorder, and configure core NGO action campaigns. Changes sync instantly to landing grid pages."
        actions={
          <button
            onClick={addProgramme}
            className="flex items-center gap-1.5 admin-btn-primary py-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Programme</span>
          </button>
        }
      />

      {/* Main Sortable List */}
      <div className="space-y-4 max-w-4xl">
        <div className="text-xs uppercase font-bold text-admin-muted tracking-wider">
          Drag to Reorder Programmes List
        </div>

        <CMSDragList
          items={data}
          onReorder={handleReorder}
          keyExtractor={(item) => item.id}
          renderItem={(item) => (
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-3 min-w-0">
                {/* Accent Color Dot indicator */}
                <div
                  className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                  style={{
                    background: `linear-gradient(to right, ${item.gradientFrom || item.accentColor}, ${item.gradientTo || item.accentColor})`
                  }}
                />
                
                <div className="min-w-0">
                  <span className="font-semibold text-sm text-admin-text block truncate">
                    {item.title}
                  </span>
                  <span className="text-[11px] text-admin-muted font-mono block mt-0.5 truncate">
                    ID: {item.id} • Eyebrow: {item.eyebrow || 'None'} • Stat: {item.stat || 'None'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <CMSBadge variant={item.active ? 'success' : 'neutral'}>
                  {item.active ? 'Active' : 'Inactive'}
                </CMSBadge>
                
                <button
                  onClick={() => setEditingId(item.id)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-admin-accent-hi hover:text-green-400 transition-colors flex items-center gap-1 text-xs font-semibold"
                >
                  <span>Configure</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => confirmDelete(item.id)}
                  className="p-1.5 rounded-lg hover:bg-admin-danger/10 text-admin-danger/70 hover:text-admin-danger transition-colors"
                  title="Delete Programme"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        />
      </div>

      {/* DRAWER PANEL (Sliding Drawer from Right) */}
      <AnimatePresence>
        {editingItem && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingId(null)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />

            {/* Slide-out Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-[500px] bg-admin-surface border-l border-admin-border shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-admin-border bg-black/10 select-none">
                <div>
                  <h3 className="font-bold text-base text-admin-text">Configure Programme</h3>
                  <p className="text-[11px] text-admin-muted mt-0.5">{editingItem.title}</p>
                </div>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-2 rounded-xl hover:bg-white/5 text-admin-muted hover:text-admin-text transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-admin-text text-left">
                
                {/* Visibilities and metadata */}
                <div className="grid grid-cols-2 gap-4 bg-admin-surface-2/40 p-4 rounded-2xl border border-admin-border">
                  <CMSToggle
                    label="Status"
                    description="Visible to users"
                    checked={editingItem.active}
                    onChange={(val) => handleItemChange(editingItem.id, 'active', val)}
                  />
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-admin-muted uppercase tracking-wider">Programme ID</label>
                    <input
                      type="text"
                      className="glass-input rounded-xl px-3 py-1.5 text-xs text-admin-text font-mono"
                      value={editingItem.id}
                      onChange={(e) => {
                        handleItemChange(editingItem.id, 'id', e.target.value);
                        handleItemChange(editingItem.id, 'customSlugHandled', true);
                      }}
                      placeholder="adhaar"
                    />
                    <span className="text-[8px] text-admin-muted">System path identifier (URL query)</span>
                  </div>
                </div>

                {/* Name, Eyebrow, Stat */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput
                    label="Programme Name"
                    value={editingItem.title}
                    onChange={(val) => handleItemChange(editingItem.id, 'title', val)}
                    maxLength={40}
                  />

                  <CMSInput
                    label="Eyebrow Topic Category"
                    value={editingItem.eyebrow}
                    onChange={(val) => handleItemChange(editingItem.id, 'eyebrow', val)}
                    maxLength={40}
                    placeholder="Quality Education"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CMSInput
                    label="Main Detail Header Heading"
                    value={editingItem.heading}
                    onChange={(val) => handleItemChange(editingItem.id, 'heading', val)}
                    maxLength={80}
                    placeholder="Providing a Foundation..."
                  />

                  <CMSInput
                    label="Floating Badge Stat"
                    value={editingItem.stat}
                    onChange={(val) => handleItemChange(editingItem.id, 'stat', val)}
                    maxLength={30}
                    placeholder="1,000+ Kids"
                  />
                </div>

                {/* Theme Gradients */}
                <div className="space-y-3 bg-admin-surface-2/20 p-4 rounded-2xl border border-admin-border">
                  <label className="text-xs font-bold text-admin-muted uppercase tracking-wider block">
                    Accent Color Theme & Gradients
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <CMSColorPicker
                      label="Solid Accent"
                      value={editingItem.accentColor}
                      onChange={(val) => handleItemChange(editingItem.id, 'accentColor', val)}
                    />
                    <CMSColorPicker
                      label="Gradient Start"
                      value={editingItem.gradientFrom || editingItem.accentColor}
                      onChange={(val) => handleItemChange(editingItem.id, 'gradientFrom', val)}
                    />
                    <CMSColorPicker
                      label="Gradient End"
                      value={editingItem.gradientTo || editingItem.accentColor}
                      onChange={(val) => handleItemChange(editingItem.id, 'gradientTo', val)}
                    />
                  </div>
                </div>

                {/* Image */}
                <CMSImageUpload
                  label="Card Background Image"
                  value={editingItem.image}
                  onChange={(val) => handleItemChange(editingItem.id, 'image', val)}
                  aspectRatio="16:10"
                  description="Cover photo displayed inside programme catalog cards."
                />

                {/* Short descriptions */}
                <CMSTextarea
                  label="Short Card Description"
                  value={editingItem.description || ''}
                  onChange={(val) => handleItemChange(editingItem.id, 'description', val)}
                  maxLength={150}
                  rows={2.5}
                  placeholder="Card summary shown in home grid..."
                />

                {/* Paragraphs Editor */}
                <div className="space-y-3 bg-admin-surface-2/40 p-4 rounded-2xl border border-admin-border">
                  <div className="flex items-center justify-between select-none">
                    <label className="text-xs font-bold text-admin-muted uppercase tracking-wider block">
                      Detailed Content Paragraphs
                    </label>
                    <button
                      type="button"
                      onClick={() => addParagraph(editingItem.id)}
                      className="text-xs text-admin-accent-hi hover:underline font-semibold"
                    >
                      + Add Paragraph
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {(editingItem.paragraphs || []).map((paragraphText, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <CMSTextarea
                          value={paragraphText}
                          onChange={(val) => handleParagraphChange(editingItem.id, idx, val)}
                          rows={3}
                          placeholder={`Paragraph ${idx + 1} content details...`}
                          className="flex-1"
                        />
                        <button
                          type="button"
                          onClick={() => deleteParagraph(editingItem.id, idx)}
                          className="p-2.5 rounded-xl bg-admin-danger/10 border border-admin-danger/25 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors mt-6 shrink-0 font-semibold"
                          title="Delete paragraph block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(editingItem.paragraphs || []).length === 0 && (
                      <p className="text-xs text-admin-muted py-2">No paragraphs added. Click "+ Add Paragraph" to write content.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-admin-border bg-black/30 flex items-center justify-end select-none">
                <button
                  onClick={() => setEditingId(null)}
                  className="admin-btn-primary py-2 px-6 text-xs font-semibold"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Programmes List"
      />

      <CMSModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Programme Warning"
        actions={
          <>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="admin-btn-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={deleteProgramme}
              className="admin-btn-danger py-1.5 text-xs"
            >
              Delete Campaign
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this programme? This removes the campaign grid card and its corresponding dynamic route page entirely. You must click save changes below to commit.</p>
      </CMSModal>
    </div>
  );
}
