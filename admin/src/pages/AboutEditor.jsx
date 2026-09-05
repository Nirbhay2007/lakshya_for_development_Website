import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSInput from '../components/ui/CMSInput';
import CMSRichText from '../components/ui/CMSRichText';
import CMSImageUpload from '../components/ui/CMSImageUpload';
import CMSDragList from '../components/ui/CMSDragList';
import { Plus, Trash2 } from 'lucide-react';

export default function AboutEditor() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('main');
  const [isDirty, setIsDirty] = useState(false);
  
  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('about');
    setData(loaded);
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('about', true);
  };

  const handleSave = () => {
    saveSection('about', data);
    setIsDirty(false);
    setSectionDirty('about', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('about');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('about', false);
  };

  // Main content field changers
  const handleMainChange = (field, value) => {
    triggerChange({
      ...data,
      main: {
        ...data.main,
        [field]: value
      }
    });
  };

  // Mission Vision changers
  const handleMvChange = (field, value) => {
    triggerChange({
      ...data,
      missionVision: {
        ...data.missionVision,
        [field]: value
      }
    });
  };

  // Reorder values list (values are stats in about.json)
  const handleReorderValues = (newValues) => {
    triggerChange({
      ...data,
      values: newValues
    });
  };

  const handleValueChange = (index, field, value) => {
    const updatedValues = data.values.map((v, i) => {
      if (i === index) {
        return { ...v, [field]: value };
      }
      return v;
    });
    triggerChange({ ...data, values: updatedValues });
  };

  const deleteValue = (index) => {
    const filtered = data.values.filter((_, i) => i !== index);
    triggerChange({ ...data, values: filtered });
  };

  const addValue = () => {
    const newValue = {
      iconName: 'ShieldCheck',
      title: 'New Value',
      description: 'Add a description details for the new value section.'
    };
    triggerChange({ ...data, values: [...data.values, newValue] });
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading about details...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="About Section Editor"
        description="Configure details for the Who We Are introduction preview, corporate Mission/Vision statements, and core institutional values."
      />

      {/* Tabs list bar */}
      <div className="flex border-b border-admin-border gap-2 select-none overflow-x-auto hide-scrollbar">
        {[
          { id: 'main', name: 'Main Content' },
          { id: 'missionVision', name: 'Mission & Vision' },
          { id: 'values', name: 'Core Values & Stats' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'border-admin-accent text-admin-accent-hi'
                : 'border-transparent text-admin-muted hover:text-admin-text'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* TABS VIEWPORT */}
      <div className="pt-2">
        {activeTab === 'main' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <CMSImageUpload
                label="About Banner Image"
                value={data.main?.image || ''}
                onChange={(val) => handleMainChange('image', val)}
                description="Aspect ratio 4:3 is recommended. Displayed alongside introduction details."
              />
              
              <CMSInput
                label="Floating Badge Text"
                value={data.main?.floatingBadge || ''}
                onChange={(val) => handleMainChange('floatingBadge', val)}
                maxLength={30}
                placeholder="18+ Years of Impact"
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <CMSInput
                  label="Section Eyebrow"
                  value={data.main?.eyebrow || ''}
                  onChange={(val) => handleMainChange('eyebrow', val)}
                  maxLength={30}
                  placeholder="WHO WE ARE"
                />
                
                <CMSInput
                  label="Headline Banner Title"
                  value={data.main?.headline || ''}
                  onChange={(val) => handleMainChange('headline', val)}
                  maxLength={80}
                  placeholder="Two promises made in 2006. Still kept today."
                />
              </div>

              <CMSRichText
                label="Body Paragraph Description"
                value={data.main?.body || ''}
                onChange={(val) => handleMainChange('body', val)}
                description="Lakshya was born from young activists..."
              />
              
              <CMSRichText
                label="Secondary Body Paragraph (Optional)"
                value={data.main?.body2 || ''}
                onChange={(val) => handleMainChange('body2', val)}
                description="By enabling villagers, women, and students..."
              />

              <div className="grid grid-cols-2 gap-4">
                <CMSInput
                  label="Primary Button Label"
                  value={data.main?.primaryBtnLabel || ''}
                  onChange={(val) => handleMainChange('primaryBtnLabel', val)}
                  maxLength={20}
                />
                
                <CMSInput
                  label="Primary Button Link"
                  value={data.main?.primaryBtnLink || ''}
                  onChange={(val) => handleMainChange('primaryBtnLink', val)}
                  placeholder="/about"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CMSInput
                  label="Secondary Button Label"
                  value={data.main?.secondaryBtnLabel || ''}
                  onChange={(val) => handleMainChange('secondaryBtnLabel', val)}
                  maxLength={20}
                />
                
                <CMSInput
                  label="Secondary Button Link"
                  value={data.main?.secondaryBtnLink || ''}
                  onChange={(val) => handleMainChange('secondaryBtnLink', val)}
                  placeholder="/contact"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'missionVision' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mission Panel */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-4">
              <CMSInput
                label="Mission Title"
                value={data.missionVision?.missionTitle || ''}
                onChange={(val) => handleMvChange('missionTitle', val)}
                maxLength={50}
              />
              
              <CMSRichText
                label="Mission Statement Description"
                value={data.missionVision?.missionBody || ''}
                onChange={(val) => handleMvChange('missionBody', val)}
                description="To promote sustainable, community-driven social and environmental health..."
              />
            </div>

            {/* Vision Panel */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-4">
              <CMSInput
                label="Vision Title"
                value={data.missionVision?.visionTitle || ''}
                onChange={(val) => handleMvChange('visionTitle', val)}
                maxLength={50}
              />
              
              <CMSRichText
                label="Vision Statement Description"
                value={data.missionVision?.visionBody || ''}
                onChange={(val) => handleMvChange('visionBody', val)}
                description="A balanced society where human development and nature coexist in harmony."
              />
            </div>
          </div>
        )}

        {activeTab === 'values' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase font-bold text-admin-muted tracking-wider">
                Reorder and Edit Core Values / Value Grid Points
              </div>
              <button
                onClick={addValue}
                className="flex items-center gap-1 admin-btn-secondary py-1 text-[11px]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <CMSDragList
              items={data.values || []}
              onReorder={handleReorderValues}
              keyExtractor={(item, index) => index}
              renderItem={(valueItem, index) => (
                <div className="space-y-3 w-full">
                  <div className="flex gap-4">
                    <CMSInput
                      label="Value Headline / Stat"
                      value={valueItem.title}
                      onChange={(val) => handleValueChange(index, 'title', val)}
                      maxLength={30}
                      className="flex-1"
                    />
                    
                    <div className="w-48">
                      <CMSInput
                        label="Lucide Icon Name"
                        value={valueItem.iconName}
                        onChange={(val) => handleValueChange(index, 'iconName', val)}
                        placeholder="ShieldCheck"
                      />
                    </div>
                    
                    <div className="flex items-end pb-1 shrink-0">
                      <button
                        onClick={() => deleteValue(index)}
                        className="p-2 rounded-xl bg-admin-danger/10 border border-admin-danger/25 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors"
                        title="Delete value block"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                      </button>
                    </div>
                  </div>

                  <CMSRichText
                    label="Description details"
                    value={valueItem.description}
                    onChange={(val) => handleValueChange(index, 'description', val)}
                  />
                </div>
              )}
            />
          </div>
        )}
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="About Section"
      />
    </div>
  );
}
