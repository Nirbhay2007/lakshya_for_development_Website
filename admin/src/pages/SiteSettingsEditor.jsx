import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection, getAllData } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSInput from '../components/ui/CMSInput';
import CMSTextarea from '../components/ui/CMSTextarea';
import CMSToggle from '../components/ui/CMSToggle';
import CMSDragList from '../components/ui/CMSDragList';
import CMSColorPicker from '../components/ui/CMSColorPicker';
import CMSImageUpload from '../components/ui/CMSImageUpload';
import { Plus, Trash2, Download, CloudUpload, FileCode, X } from 'lucide-react';
import JSZip from 'jszip';
import SecurityLockPanel from '../components/ui/SecurityLockPanel';

export default function SiteSettingsEditor() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('general');
  const [isDirty, setIsDirty] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'import' | 'export'

  const securityKeyHash = useAdminStore((state) => state.securityKeyHash);
  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);
  const draftFlags = useAdminStore((state) => state.draftFlags);
  const publishAll = useAdminStore((state) => state.publishAll);

  const [isAdvancedUnlocked, setIsAdvancedUnlocked] = useState(!!securityKeyHash);

  useEffect(() => {
    setIsAdvancedUnlocked(!!securityKeyHash);
  }, [securityKeyHash]);

  useEffect(() => {
    const loaded = getSectionData('settings');
    const sanitized = {
      ...loaded,
      categories: loaded?.categories || ['Adhaar', 'Vaidehi', 'Yagna', 'Events', 'General'],
      departments: loaded?.departments || ['Leadership', 'Programme', 'Operations', 'Communications']
    };
    setData(sanitized);
  }, []);

  useEffect(() => {
    return () => {
      useAdminStore.getState().lockSecurity();
    };
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('settings', true);
  };

  const handleSave = () => {
    saveSection('settings', data);
    setIsDirty(false);
    setSectionDirty('settings', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('settings');
    const sanitized = {
      ...loaded,
      categories: loaded?.categories || ['Adhaar', 'Vaidehi', 'Yagna', 'Events', 'General'],
      departments: loaded?.departments || ['Leadership', 'Programme', 'Operations', 'Communications']
    };
    setData(sanitized);
    setIsDirty(false);
    setSectionDirty('settings', false);
  };

  // Field change utilities
  const handleNestedChange = (parentKey, field, value) => {
    triggerChange({
      ...data,
      [parentKey]: {
        ...data[parentKey],
        [field]: value
      }
    });
  };

  // Nav reorders
  const handleReorderNav = (newList) => {
    triggerChange({ ...data, navigation: newList });
  };

  const handleNavItemChange = (id, field, value) => {
    const updated = data.navigation.map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    triggerChange({ ...data, navigation: updated });
  };

  const addNavItem = () => {
    if (data.navigation.length >= 8) {
      alert('Maximum of 8 navigation items allowed');
      return;
    }
    const newItem = {
      id: `n_${Date.now()}`,
      name: 'New Menu Label',
      path: '/new-link',
      newTab: false,
      active: true
    };
    triggerChange({ ...data, navigation: [...data.navigation, newItem] });
  };

  const deleteNavItem = (id) => {
    const filtered = data.navigation.filter((item) => item.id !== id);
    triggerChange({ ...data, navigation: filtered });
  };

  const handleAddCategory = (cat) => {
    const trimmed = cat.trim();
    if (!trimmed) return;
    if ((data.categories || []).includes(trimmed)) {
      alert('Category already exists');
      return;
    }
    triggerChange({
      ...data,
      categories: [...(data.categories || []), trimmed]
    });
  };

  const handleRemoveCategory = (cat) => {
    const filtered = (data.categories || []).filter(c => c !== cat);
    triggerChange({
      ...data,
      categories: filtered
    });
  };

  const handleAddDept = (dept) => {
    const trimmed = dept.trim();
    if (!trimmed) return;
    if ((data.departments || []).includes(trimmed)) {
      alert('Department already exists');
      return;
    }
    triggerChange({
      ...data,
      departments: [...(data.departments || []), trimmed]
    });
  };

  const handleRemoveDept = (dept) => {
    const filtered = (data.departments || []).filter(d => d !== dept);
    triggerChange({
      ...data,
      departments: filtered
    });
  };

  // Export JSON functionality using JSZip
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const allData = getAllData();
      const zip = new JSZip();

      // Append all files as formatted JSON
      Object.keys(allData).forEach((sectionName) => {
        const fileContent = JSON.stringify(allData[sectionName], null, 2);
        zip.file(`${sectionName}.json`, fileContent);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `lakshya_cms_content_backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const store = useAdminStore.getState();
      store.logActivity('Security', 'Settings', 'Exported CMS configuration backups in .zip');
    } catch (e) {
      console.error('ZIP compilation failed', e);
      alert('Failed to compile backups folder. Check developer logs.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportClick = () => {
    if (!securityKeyHash) {
      setPendingAction('export');
      setShowLockModal(true);
      return;
    }
    handleExportZip();
  };

  const handleImportClick = () => {
    if (!securityKeyHash) {
      setPendingAction('import');
      setShowLockModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const fileInputRef = React.useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file);
        const fileNames = Object.keys(zip.files);
        
        let importedCount = 0;
        for (const fileName of fileNames) {
          if (fileName.endsWith('.json')) {
            const sectionKey = fileName.replace('.json', '');
            const content = await zip.files[fileName].async('text');
            try {
              const parsedData = JSON.parse(content);
              saveSection(sectionKey, parsedData);
              importedCount++;
            } catch (err) {
              console.error(`Failed to parse ${fileName}`, err);
            }
          }
        }
        
        const store = useAdminStore.getState();
        store.logActivity('Security', 'Settings', `Imported ${importedCount} sections from ZIP backup`);
        alert(`Successfully imported ${importedCount} sections! The data has been saved as drafts. Please review and publish them.`);
        window.location.reload();
      } else if (file.name.endsWith('.json')) {
        // Handle single json file import
        const content = await file.text();
        const sectionKey = file.name.replace('.json', '');
        const parsedData = JSON.parse(content);
        saveSection(sectionKey, parsedData);
        
        const store = useAdminStore.getState();
        store.logActivity('Security', 'Settings', `Imported 1 section (${sectionKey}) from JSON backup`);
        alert(`Successfully imported ${sectionKey} section! It has been saved as a draft.`);
        window.location.reload();
      } else {
        alert('Please upload a .zip file or a .json file.');
      }
    } catch (err) {
      console.error('Import failed', err);
      alert('Failed to import file. Make sure it is a valid backup.');
    } finally {
      setIsImporting(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const draftCount = Object.keys(draftFlags).filter((k) => draftFlags[k]).length;

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading settings...</div>;

  return (
    <div className="space-y-6">
      {showLockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-admin-surface rounded-2xl shadow-2xl overflow-hidden border border-admin-border p-4">
            <button 
              onClick={() => {
                setShowLockModal(false);
                setPendingAction(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-admin-muted hover:text-admin-text transition-colors z-50 focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="h-96 relative">
              <SecurityLockPanel onUnlock={() => {
                setShowLockModal(false);
                if (pendingAction === 'export') {
                  handleExportZip();
                } else if (pendingAction === 'import') {
                  fileInputRef.current?.click();
                }
                setPendingAction(null);
              }} />
            </div>
          </div>
        </div>
      )}
      <PageHeader
        title="Site Settings Editor"
        description="Configure website SEO metadata, menu items, themes, header logos, custom CSS injections, and backup exports."
        actions={
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".zip,application/json" 
              className="hidden" 
            />
            <button
              onClick={handleImportClick}
              disabled={isImporting}
              className="flex items-center gap-1.5 admin-btn-secondary py-2 text-xs font-semibold"
            >
              <CloudUpload className="w-4 h-4" />
              <span>{isImporting ? 'Importing...' : 'Import JSON / ZIP'}</span>
            </button>
            <button
              onClick={handleExportClick}
              disabled={isExporting}
              className="flex items-center gap-1.5 admin-btn-secondary py-2 text-xs font-semibold"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Exporting...' : 'Export JSON ZIP'}</span>
            </button>
            
            {draftCount > 0 && (
              <button
                onClick={() => {
                  publishAll();
                  alert('Published all updates successfully!');
                }}
                className="flex items-center gap-1.5 admin-btn-primary py-2 text-xs font-semibold"
              >
                <CloudUpload className="w-4 h-4" />
                <span>Publish all drafts</span>
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex border-b border-admin-border gap-2 select-none font-sans overflow-x-auto no-scrollbar">
        {[
          { id: 'general', name: 'General' },
          { id: 'navigation', name: 'Navigation Menu' },
          { id: 'taxonomies', name: 'Categories & Depts' },
          { id: 'seo', name: 'SEO & Analytics' },
          { id: 'social', name: 'Social Handles' },
          { id: 'theme', name: 'Global Theme' },
          { id: 'advanced', name: 'Advanced CSS/Code' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-admin-accent text-admin-accent-hi'
                : 'border-transparent text-admin-muted hover:text-admin-text'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* TABS CONTENT */}
      <div className="pt-2">

        {/* GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <CMSImageUpload
                  label="Logo (Light Backgrounds)"
                  value={data.general?.logoLight || ''}
                  onChange={(val) => handleNestedChange('general', 'logoLight', val)}
                />
                <CMSImageUpload
                  label="Logo (Dark Backgrounds)"
                  value={data.general?.logoDark || ''}
                  onChange={(val) => handleNestedChange('general', 'logoDark', val)}
                />
              </div>
              <CMSImageUpload
                label="Favicon Asset (.png/.ico)"
                value={data.general?.favicon || ''}
                onChange={(val) => handleNestedChange('general', 'favicon', val)}
              />
            </div>

            <div className="space-y-4">
              <CMSInput
                label="Site Name / Title"
                value={data.general?.siteName || ''}
                onChange={(val) => handleNestedChange('general', 'siteName', val)}
                maxLength={40}
              />
              <CMSInput
                label="Corporate Tagline"
                value={data.general?.tagline || ''}
                onChange={(val) => handleNestedChange('general', 'tagline', val)}
                maxLength={80}
              />
              <CMSInput
                label="Footer Copyright Clause"
                value={data.general?.footerCopyright || ''}
                onChange={(val) => handleNestedChange('general', 'footerCopyright', val)}
                maxLength={100}
              />
            </div>
          </div>
        )}

        {/* NAVIGATION MENUS */}
        {activeTab === 'navigation' && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between border-b border-admin-border pb-3">
              <span className="text-xs uppercase font-bold text-admin-muted tracking-wider">Drag to Reorder Menus</span>
            </div>

            <CMSDragList
              items={data.navigation || []}
              onReorder={handleReorderNav}
              keyExtractor={(item) => item.id}
              renderItem={(item) => (
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full text-left">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
                    <CMSInput
                      label="Menu Text Label"
                      value={item.name}
                      onChange={(val) => handleNavItemChange(item.id, 'name', val)}
                    />
                    <CMSInput
                      label="Redirect Path URL"
                      placeholder="e.g. /about or external link"
                      value={item.path}
                      onChange={(val) => handleNavItemChange(item.id, 'path', val)}
                    />
                  </div>

                  <div className="flex items-end justify-between gap-4 shrink-0 pb-1.5 w-full sm:w-auto">
                    <CMSToggle
                      label="New Tab"
                      checked={item.newTab || false}
                      onChange={(val) => handleNavItemChange(item.id, 'newTab', val)}
                    />
                    
                    <CMSToggle
                      label="Active"
                      checked={item.active}
                      onChange={(val) => handleNavItemChange(item.id, 'active', val)}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* SEO PARAMETERS */}
        {activeTab === 'seo' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <CMSImageUpload
                label="OG Image (Open Graph Image)"
                value={data.seo?.ogImage || ''}
                onChange={(val) => handleNestedChange('seo', 'ogImage', val)}
                description="Dimensions: 1200x630px. Image shown on social links embeds."
              />
            </div>
            
            <div className="space-y-4">
              <CMSInput
                label="Meta Browser Title"
                value={data.seo?.metaTitle || ''}
                onChange={(val) => handleNestedChange('seo', 'metaTitle', val)}
                maxLength={60}
                description="Google search results title name."
              />
              <CMSTextarea
                label="Meta Site Description"
                value={data.seo?.metaDescription || ''}
                onChange={(val) => handleNestedChange('seo', 'metaDescription', val)}
                maxLength={160}
                rows={3}
                description="Google search description excerpt."
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-admin-border pt-4">
                <CMSInput
                  label="OG Share Title"
                  value={data.seo?.ogTitle || ''}
                  onChange={(val) => handleNestedChange('seo', 'ogTitle', val)}
                  maxLength={60}
                />
                <CMSInput
                  label="Canonical URL Name"
                  placeholder="https://lakshyafordevelopment.org"
                  value={data.seo?.canonicalUrl || ''}
                  onChange={(val) => handleNestedChange('seo', 'canonicalUrl', val)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CMSTextarea
                  label="OG Share Description"
                  value={data.seo?.ogDescription || ''}
                  onChange={(val) => handleNestedChange('seo', 'ogDescription', val)}
                  maxLength={150}
                  rows={2}
                />
                
                <CMSInput
                  label="Google Analytics Measurement ID"
                  placeholder="G-XXXXXXXXXX"
                  value={data.seo?.googleAnalyticsId || ''}
                  onChange={(val) => handleNestedChange('seo', 'googleAnalyticsId', val)}
                />
              </div>
            </div>
          </div>
        )}

        {/* SOCIAL LINKS */}
        {activeTab === 'social' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] max-w-3xl space-y-4">
            <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Social Media Handles & Targets
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CMSInput
                label="Facebook Link"
                placeholder="https://facebook.com/..."
                value={data.social?.facebook || ''}
                onChange={(val) => handleNestedChange('social', 'facebook', val)}
              />
              <CMSInput
                label="Twitter/X Link"
                placeholder="https://twitter.com/..."
                value={data.social?.twitter || ''}
                onChange={(val) => handleNestedChange('social', 'twitter', val)}
              />
              <CMSInput
                label="Instagram Link"
                placeholder="https://instagram.com/..."
                value={data.social?.instagram || ''}
                onChange={(val) => handleNestedChange('social', 'instagram', val)}
              />
              <CMSInput
                label="LinkedIn Link"
                placeholder="https://linkedin.com/company/..."
                value={data.social?.linkedin || ''}
                onChange={(val) => handleNestedChange('social', 'linkedin', val)}
              />
              <CMSInput
                label="YouTube Link"
                placeholder="https://youtube.com/c/..."
                value={data.social?.youtube || ''}
                onChange={(val) => handleNestedChange('social', 'youtube', val)}
              />
              <CMSInput
                label="WhatsApp Phone Number"
                placeholder="e.g. +919415012345"
                value={data.social?.whatsapp || ''}
                onChange={(val) => handleNestedChange('social', 'whatsapp', val)}
              />
            </div>
          </div>
        )}

        {/* THEMES */}
        {activeTab === 'theme' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] max-w-3xl space-y-6">
            <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Global Color Schemes & UI Configurations
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <CMSColorPicker
                label="Primary Brand Color"
                value={data.theme?.primaryColor || '#2e7d32'}
                onChange={(val) => handleNestedChange('theme', 'primaryColor', val)}
              />
              
              <CMSColorPicker
                label="Accent Color Theme"
                value={data.theme?.accentColor || '#f5a623'}
                onChange={(val) => handleNestedChange('theme', 'accentColor', val)}
              />
            </div>

            <div className="border-t border-admin-border pt-4">
              <CMSToggle
                label="Dark Mode Support (Future proof)"
                description="Enable dark themes variables overrides"
                checked={data.theme?.darkMode || false}
                onChange={(val) => handleNestedChange('theme', 'darkMode', val)}
              />
            </div>
          </div>
        )}

        {/* ADVANCED CUSTOM CSS & SCRIPTS INJECTIONS */}
        {activeTab === 'advanced' && (
          !isAdvancedUnlocked ? (
            <div className="relative w-full h-[50vh] max-w-3xl mx-auto">
              <SecurityLockPanel onUnlock={() => setIsAdvancedUnlocked(true)} />
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] max-w-3xl space-y-6">
              <h3 className="text-sm uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3 flex items-center gap-1">
                <FileCode className="w-5 h-5 text-admin-amber" />
                <span>Developer Settings & Scripts Injection</span>
              </h3>

              {/* Maintenance Mode Configuration Box */}
              <div className="bg-admin-surface-2 p-5 rounded-2xl border border-admin-border space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-admin-border/60 pb-4">
                  <div>
                    <h4 className="text-sm font-bold text-admin-text uppercase tracking-wider flex items-center gap-2">
                      <span>⚙️ Maintenance Mode Settings</span>
                    </h4>
                    <p className="text-xs text-admin-muted mt-0.5">Lock website or specific pages during updates</p>
                  </div>
                  <CMSToggle
                    label="Maintenance Status"
                    checked={data.advanced?.maintenanceMode || false}
                    onChange={(val) => handleNestedChange('advanced', 'maintenanceMode', val)}
                  />
                </div>

                {data.advanced?.maintenanceMode && (
                  <div className="space-y-5 pt-1">
                    {/* Scope Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-wider text-admin-muted block">
                        Maintenance Scope / Coverage:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleNestedChange('advanced', 'maintenanceScope', 'all')}
                          className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                            (data.advanced?.maintenanceScope || 'all') === 'all'
                              ? 'bg-admin-accent/15 border-admin-accent text-admin-accent-hi font-semibold shadow-md'
                              : 'bg-admin-surface border-admin-border text-admin-muted hover:text-admin-text'
                          }`}
                        >
                          <span className="text-lg">🔒</span>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider">Entire Website (Full Lock)</div>
                            <div className="text-[11px] font-normal text-admin-muted mt-0.5">Locks all public pages under a global maintenance screen</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleNestedChange('advanced', 'maintenanceScope', 'selective')}
                          className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                            data.advanced?.maintenanceScope === 'selective'
                              ? 'bg-admin-accent/15 border-admin-accent text-admin-accent-hi font-semibold shadow-md'
                              : 'bg-admin-surface border-admin-border text-admin-muted hover:text-admin-text'
                          }`}
                        >
                          <span className="text-lg">🎯</span>
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider">Specific Pages Only (Selective)</div>
                            <div className="text-[11px] font-normal text-admin-muted mt-0.5">Lock only chosen pages while keeping rest of website active</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Page Selector Grid (if selective mode) */}
                    {data.advanced?.maintenanceScope === 'selective' && (
                      <div className="bg-admin-surface p-4 rounded-xl border border-admin-border space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-admin-accent-hi uppercase tracking-wider">
                            Select Pages Under Maintenance:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const allRoutes = ['/', '/about', '/programmes', '/gallery', '/contact', '/donate', '/career', '/legal'];
                                handleNestedChange('advanced', 'maintenancePages', allRoutes);
                              }}
                              className="text-[11px] text-admin-accent hover:underline font-semibold cursor-pointer"
                            >
                              Select All
                            </button>
                            <span className="text-admin-muted text-xs">•</span>
                            <button
                              type="button"
                              onClick={() => handleNestedChange('advanced', 'maintenancePages', [])}
                              className="text-[11px] text-admin-muted hover:text-admin-text cursor-pointer"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                          {[
                            { path: '/', label: 'Home Page', icon: '🌐' },
                            { path: '/about', label: 'About Us', icon: 'ℹ️' },
                            { path: '/programmes', label: 'Programmes', icon: '🎓' },
                            { path: '/gallery', label: 'Gallery', icon: '🖼️' },
                            { path: '/contact', label: 'Contact Us', icon: '📞' },
                            { path: '/donate', label: 'Donate & Support', icon: '💳' },
                            { path: '/career', label: 'Careers', icon: '💼' },
                            { path: '/legal', label: 'Legal Pages', icon: '📜' }
                          ].map((p) => {
                            const selectedPages = Array.isArray(data.advanced?.maintenancePages) ? data.advanced.maintenancePages : [];
                            const isChecked = selectedPages.includes(p.path);
                            return (
                              <label
                                key={p.path}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold'
                                    : 'bg-admin-surface-2 border-admin-border text-admin-muted hover:text-admin-text'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    let updated = [...selectedPages];
                                    if (e.target.checked) {
                                      if (!updated.includes(p.path)) updated.push(p.path);
                                    } else {
                                      updated = updated.filter(x => x !== p.path);
                                    }
                                    handleNestedChange('advanced', 'maintenancePages', updated);
                                  }}
                                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                                />
                                <span className="text-sm">{p.icon}</span>
                                <span className="text-xs">{p.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Maintenance Message */}
                    <CMSTextarea
                      label="Custom Maintenance Screen Message"
                      value={data.advanced?.maintenanceMessage || ''}
                      onChange={(val) => handleNestedChange('advanced', 'maintenanceMessage', val)}
                      rows={2}
                      placeholder="Site or page is currently undergoing scheduled maintenance. Please check back shortly."
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <CMSTextarea
                  label="Custom CSS Overrides Styling"
                  value={data.advanced?.customCss || ''}
                  onChange={(val) => handleNestedChange('advanced', 'customCss', val)}
                  placeholder="/* Custom CSS styling directives here */"
                  rows={4}
                  className="font-mono text-xs"
                />

                <CMSTextarea
                  label="Header Injected Scripts (<head> tag)"
                  value={data.advanced?.customScriptsHead || ''}
                  onChange={(val) => handleNestedChange('advanced', 'customScriptsHead', val)}
                  placeholder="<!-- Paste headers analytics code or scripts tags -->"
                  rows={3}
                  className="font-mono text-xs"
                />

                <CMSTextarea
                  label="Footer Injected Scripts (before </body> tag)"
                  value={data.advanced?.customScriptsBody || ''}
                  onChange={(val) => handleNestedChange('advanced', 'customScriptsBody', val)}
                  placeholder="<!-- Custom body scripts code tags -->"
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )
        )}

        {/* CATEGORIES & DEPARTMENTS SETTINGS */}
        {activeTab === 'taxonomies' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-admin-text text-left">
            {/* Gallery Categories */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-4">
              <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
                Gallery Categories
              </h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  id="new-category-input"
                  placeholder="e.g. Health Drive"
                  className="glass-input rounded-xl px-4 py-2 text-sm text-admin-text flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCategory(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('new-category-input');
                    if (input && input.value.trim()) {
                      handleAddCategory(input.value.trim());
                      input.value = '';
                    }
                  }}
                  className="admin-btn-primary py-2 px-4 text-xs font-semibold shrink-0"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(data.categories || []).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-admin-surface-2/40 p-2.5 rounded-xl border border-admin-border">
                    <span className="font-medium text-xs">{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      disabled={(data.categories || []).length <= 1}
                      className="text-admin-danger hover:text-red-400 disabled:opacity-30 transition-colors p-1"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Departments */}
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-4">
              <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
                Team Departments
              </h3>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  id="new-dept-input"
                  placeholder="e.g. Logistics"
                  className="glass-input rounded-xl px-4 py-2 text-sm text-admin-text flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddDept(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('new-dept-input');
                    if (input && input.value.trim()) {
                      handleAddDept(input.value.trim());
                      input.value = '';
                    }
                  }}
                  className="admin-btn-primary py-2 px-4 text-xs font-semibold shrink-0"
                >
                  Add
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {(data.departments || []).map((dept, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-admin-surface-2/40 p-2.5 rounded-xl border border-admin-border">
                    <span className="font-medium text-xs">{dept}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDept(dept)}
                      disabled={(data.departments || []).length <= 1}
                      className="text-admin-danger hover:text-red-400 disabled:opacity-30 transition-colors p-1"
                      title="Delete Department"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Site Settings"
      />
    </div>
  );
}
