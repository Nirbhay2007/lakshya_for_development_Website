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

export default function ImpactEditor() {
  const [data, setData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('impact');
    setData(loaded);
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('impact', true);
  };

  const handleSave = () => {
    saveSection('impact', data);
    setIsDirty(false);
    setSectionDirty('impact', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('impact');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('impact', false);
  };

  const handleSettingChange = (field, value) => {
    triggerChange({ ...data, [field]: value });
  };

  const handleItemChange = (id, field, value) => {
    const updatedItems = data.stats.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    triggerChange({ ...data, stats: updatedItems });
  };

  const handleReorder = (newStats) => {
    triggerChange({ ...data, stats: newStats });
  };

  const addStat = () => {
    if (data.stats.length >= 6) {
      alert('Maximum of 6 stats allowed');
      return;
    }
    const newId = `stat_${Date.now()}`;
    const newStat = {
      id: newId,
      number: '100+',
      labelLine1: 'New Stat',
      labelLine2: 'Description',
      icon: 'Heart',
      active: true
    };
    triggerChange({ ...data, stats: [...data.stats, newStat] });
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const deleteStat = () => {
    const filtered = data.stats.filter((item) => item.id !== deleteConfirmId);
    triggerChange({ ...data, stats: filtered });
    setDeleteConfirmId(null);
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading impact numbers...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Impact Numbers Editor"
        description="Edit NGO statistics, count-up animation states, color themes, and icons displayed inside the key impact segment."
        actions={
          <button
            onClick={addStat}
            disabled={data.stats.length >= 6}
            className="flex items-center gap-1.5 admin-btn-primary py-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stat Card ({data.stats.length}/6)</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-6">
            <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Section Theme settings
            </h3>

            <CMSToggle
              label="Enable Count-up Effect"
              description="Animate stats on page scroll"
              checked={data.enableCountUp !== false}
              onChange={(val) => handleSettingChange('enableCountUp', val)}
            />

            <div className="space-y-4">
              <CMSColorPicker
                label="Section Background"
                value={data.bgColor || '#111811'}
                onChange={(val) => handleSettingChange('bgColor', val)}
              />
              <CMSColorPicker
                label="Accent Highlight Color"
                value={data.accentColor || '#f5a623'}
                onChange={(val) => handleSettingChange('accentColor', val)}
              />
            </div>
          </div>
        </div>

        {/* Stats reorder list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="text-xs uppercase font-bold text-admin-muted tracking-wider">
            Reorder Stat Items
          </div>

          <CMSDragList
            items={data.stats}
            onReorder={handleReorder}
            keyExtractor={(item) => item.id}
            renderItem={(item) => (
              <div className="space-y-4 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CMSInput
                    label="Stat Number"
                    placeholder="e.g. 15,000+"
                    value={item.number}
                    onChange={(val) => handleItemChange(item.id, 'number', val)}
                  />
                  <CMSInput
                    label="Icon Name"
                    placeholder="e.g. Heart"
                    value={item.icon}
                    onChange={(val) => handleItemChange(item.id, 'icon', val)}
                  />
                  <div className="flex items-end justify-between pb-1.5">
                    <CMSToggle
                      label="Active"
                      checked={item.active}
                      onChange={(val) => handleItemChange(item.id, 'active', val)}
                    />
                    <button
                      onClick={() => confirmDelete(item.id)}
                      className="p-2 rounded-xl bg-admin-danger/10 border border-admin-danger/25 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors shrink-0"
                      title="Delete Stat"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CMSInput
                    label="Label Line 1"
                    placeholder="Underprivileged"
                    value={item.labelLine1}
                    onChange={(val) => handleItemChange(item.id, 'labelLine1', val)}
                  />
                  <CMSInput
                    label="Label Line 2"
                    placeholder="Children Educated"
                    value={item.labelLine2}
                    onChange={(val) => handleItemChange(item.id, 'labelLine2', val)}
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
        sectionName="Impact Numbers"
      />

      <CMSModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Impact Card Warning"
        actions={
          <>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="admin-btn-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={deleteStat}
              className="admin-btn-danger py-1.5 text-xs"
            >
              Delete Card
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this impact card? This will remove the stats from the home page. You must save changes to commit.</p>
      </CMSModal>
    </div>
  );
}
