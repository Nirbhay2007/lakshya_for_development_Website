import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSDragList from '../components/ui/CMSDragList';
import CMSInput from '../components/ui/CMSInput';
import CMSToggle from '../components/ui/CMSToggle';
import CMSColorPicker from '../components/ui/CMSColorPicker';
import CMSModal from '../components/ui/CMSModal';
import { Plus, Trash2 } from 'lucide-react';

export default function EventsEditor() {
  const [data, setData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('events');
    setData(loaded);
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('events', true);
  };

  const handleSave = () => {
    saveSection('events', data);
    setIsDirty(false);
    setSectionDirty('events', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('events');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('events', false);
  };

  const handleSettingChange = (field, value) => {
    triggerChange({ ...data, [field]: value });
  };

  const handleItemChange = (id, field, value) => {
    const updatedItems = data.items.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    triggerChange({ ...data, items: updatedItems });
  };

  const handleReorder = (newItems) => {
    triggerChange({ ...data, items: newItems });
  };

  const addEvent = () => {
    if (data.items.length >= 10) {
      alert('Maximum of 10 events allowed');
      return;
    }
    const newId = `event_${Date.now()}`;
    const newEvent = {
      id: newId,
      text: 'Upcoming Lakshya Camp details entered here.',
      date: new Date().toISOString().split('T')[0],
      active: true,
      link: ''
    };
    triggerChange({ ...data, items: [...data.items, newEvent] });
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const deleteEvent = () => {
    const filtered = data.items.filter((item) => item.id !== deleteConfirmId);
    triggerChange({ ...data, items: filtered });
    setDeleteConfirmId(null);
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading events...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events Ticker Editor"
        description="Edit the running text marquee displayed on the homepage. Configure text contents, dates, redirects, marquee speeds, and colors."
        actions={
          <button
            onClick={addEvent}
            disabled={data.items.length >= 10}
            className="flex items-center gap-1.5 admin-btn-primary py-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Event ({data.items.length}/10)</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/[0.04] space-y-6">
            <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Marquee Theme & Speed
            </h3>
            
            {/* Speed Dial */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-admin-muted uppercase tracking-wider block">
                Scroll Speed
              </label>
              <div className="grid grid-cols-3 gap-2 bg-admin-surface-2 p-1.5 rounded-xl border border-admin-border">
                {['slow', 'medium', 'fast'].map((speedVal) => (
                  <button
                    key={speedVal}
                    onClick={() => handleSettingChange('speed', speedVal)}
                    className={`py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer text-center ${
                      data.speed === speedVal
                        ? 'bg-admin-accent text-white'
                        : 'text-admin-muted hover:text-admin-text'
                    }`}
                  >
                    {speedVal}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors picker */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CMSColorPicker
                label="Background Color"
                value={data.bgColor || '#2e7d32'}
                onChange={(val) => handleSettingChange('bgColor', val)}
              />
              <CMSColorPicker
                label="Text Color"
                value={data.textColor || '#ffffff'}
                onChange={(val) => handleSettingChange('textColor', val)}
              />
            </div>
          </div>
        </div>

        {/* Reorderable events list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="text-xs uppercase font-bold text-admin-muted tracking-wider">
            Reorder Ticker Events
          </div>

          <CMSDragList
            items={data.items}
            onReorder={handleReorder}
            keyExtractor={(item) => item.id}
            renderItem={(item) => (
              <div className="space-y-4 w-full">
                 <div className="flex flex-col sm:flex-row items-end gap-3">
                  <CMSInput
                    label="Event Text"
                    placeholder="Event text (e.g. Free Medical Checkup Camp this Sunday)"
                    value={item.text}
                    onChange={(val) => handleItemChange(item.id, 'text', val)}
                    maxLength={150}
                    className="flex-1"
                  />
                  
                  <div className="flex items-end gap-3 shrink-0">
                    <div className="w-44 relative">
                      <CMSInput
                        type="date"
                        label="Date"
                        value={item.date}
                        onChange={(val) => handleItemChange(item.id, 'date', val)}
                      />
                      {item.date && item.date > new Date().toISOString().split('T')[0] ? (
                        <span className="text-[10px] text-admin-amber font-semibold block mt-1">
                          ⚠️ Scheduled to show on {item.date}
                        </span>
                      ) : item.date ? (
                        <span className="text-[10px] text-forest-500 font-semibold block mt-1">
                          ✓ Published
                        </span>
                      ) : null}
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 pb-1">
                      <CMSToggle
                        checked={item.active}
                        onChange={(val) => handleItemChange(item.id, 'active', val)}
                        label="Active"
                      />
                      
                      <button
                        onClick={() => confirmDelete(item.id)}
                        className="p-2.5 rounded-xl bg-admin-danger/10 border border-admin-danger/25 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1">
                  <CMSInput
                    label="Optional Action Link"
                    placeholder="/about or external HTTPS URL"
                    value={item.link || ''}
                    onChange={(val) => handleItemChange(item.id, 'link', val)}
                    description="Users can click the event banner to follow this link."
                  />
                </div>
              </div>
            )}
          />
        </div>
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Events Ticker"
      />

      <CMSModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Ticker Item Warning"
        actions={
          <>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="admin-btn-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={deleteEvent}
              className="admin-btn-danger py-1.5 text-xs"
            >
              Delete Event
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this event? This will remove it from the home page running marquee. You must save changes to commit.</p>
      </CMSModal>
    </div>
  );
}
