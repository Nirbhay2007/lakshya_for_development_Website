import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSInput from '../components/ui/CMSInput';
import CMSRichText from '../components/ui/CMSRichText';
import { FileText, ShieldAlert } from 'lucide-react';

export default function LegalEditor() {
  const [data, setData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('privacyPolicy');
  
  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('legal');
    setData(loaded);
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('legal', true);
  };

  const handleSave = () => {
    saveSection('legal', data);
    setIsDirty(false);
    setSectionDirty('legal', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('legal');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('legal', false);
  };

  const handleFieldChange = (policyKey, field, value) => {
    const updatedPolicy = {
      ...data[policyKey],
      [field]: value
    };
    triggerChange({
      ...data,
      [policyKey]: updatedPolicy
    });
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm font-sans">Loading legal pages data...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal Pages Editor"
        description="Configure titles, last updated timestamps, and full HTML/text content for your website's Privacy Policy and Terms & Conditions."
      />

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-admin-border pb-px">
        <button
          onClick={() => setActiveTab('privacyPolicy')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'privacyPolicy'
              ? 'border-forest-500 text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          <FileText className="w-4 h-4" />
          Privacy Policy
        </button>
        <button
          onClick={() => setActiveTab('termsConditions')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'termsConditions'
              ? 'border-forest-500 text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Terms &amp; Conditions
        </button>
        <button
          onClick={() => setActiveTab('refundPolicy')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'refundPolicy'
              ? 'border-forest-500 text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          <FileText className="w-4 h-4" />
          Refund Policy
        </button>
        <button
          onClick={() => setActiveTab('cancellationPolicy')}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'cancellationPolicy'
              ? 'border-forest-500 text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          <FileText className="w-4 h-4" />
          Cancellation Policy
        </button>
      </div>

      {/* Active Editor Panel */}
      <div className="admin-card p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CMSInput
            label="Page Title"
            value={data[activeTab]?.title || ''}
            onChange={(val) => handleFieldChange(activeTab, 'title', val)}
            placeholder={activeTab === 'privacyPolicy' ? 'Privacy Policy' : activeTab === 'refundPolicy' ? 'Refund Policy' : activeTab === 'cancellationPolicy' ? 'Cancellation Policy' : 'Terms & Conditions'}
            maxLength={80}
            required
          />
          <CMSInput
            label="Last Updated Date / Excerpt"
            value={data[activeTab]?.lastUpdated || ''}
            onChange={(val) => handleFieldChange(activeTab, 'lastUpdated', val)}
            placeholder="e.g. July 15, 2026"
            maxLength={50}
          />
        </div>

        <CMSRichText
          label="Page Content"
          value={data[activeTab]?.content || ''}
          onChange={(val) => handleFieldChange(activeTab, 'content', val)}
          description="Use the formatting toolbar to design heading sections, formats, links, or lists."
        />
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    </div>
  );
}
