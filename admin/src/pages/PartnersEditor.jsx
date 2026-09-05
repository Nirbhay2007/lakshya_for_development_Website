import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSDragList from '../components/ui/CMSDragList';
import CMSInput from '../components/ui/CMSInput';
import CMSToggle from '../components/ui/CMSToggle';
import CMSModal from '../components/ui/CMSModal';
import CMSImageUpload from '../components/ui/CMSImageUpload';
import { Plus, Trash2, FolderOpen, AlertTriangle } from 'lucide-react';

export default function PartnersEditor() {
  const [data, setData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // for partner cards delete
  const [deleteRowConfirmId, setDeleteRowConfirmId] = useState(null); // for row delete

  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('partners');
    setData(loaded);
    if (loaded && Array.isArray(loaded.rows) && loaded.rows.length > 0) {
      setSelectedRowId(loaded.rows[0].id);
    }
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('partners', true);
  };

  const handleSave = () => {
    saveSection('partners', data);
    setIsDirty(false);
    setSectionDirty('partners', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('partners');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('partners', false);
    if (loaded && Array.isArray(loaded.rows) && loaded.rows.length > 0) {
      setSelectedRowId(loaded.rows[0].id);
    } else {
      setSelectedRowId('');
    }
  };

  const handleSettingChange = (field, value) => {
    triggerChange({
      ...data,
      settings: {
        ...data.settings,
        [field]: value
      }
    });
  };

  // Row management functions
  const addRow = () => {
    const newId = `row_${Date.now()}`;
    const newRow = {
      id: newId,
      heading: `Partner Category Heading`,
      partners: []
    };
    const updatedRows = [...(data.rows || []), newRow];
    triggerChange({ ...data, rows: updatedRows });
    setSelectedRowId(newId);
  };

  const confirmDeleteRow = (id) => {
    setDeleteRowConfirmId(id);
  };

  const deleteRow = () => {
    const filteredRows = data.rows.filter(r => r.id !== deleteRowConfirmId);
    triggerChange({ ...data, rows: filteredRows });
    setDeleteRowConfirmId(null);
    if (filteredRows.length > 0) {
      setSelectedRowId(filteredRows[0].id);
    } else {
      setSelectedRowId('');
    }
  };

  const handleRowHeadingChange = (rowId, val) => {
    const updatedRows = data.rows.map(r => {
      if (r.id === rowId) {
        return { ...r, heading: val };
      }
      return r;
    });
    triggerChange({ ...data, rows: updatedRows });
  };

  // Partners inside row management
  const selectedRow = data?.rows?.find(r => r.id === selectedRowId);

  const addPartnerCard = () => {
    if (!selectedRowId) return;
    const newId = `p_${Date.now()}`;
    const newPartner = {
      id: newId,
      logo: '',
      active: true
    };
    const updatedRows = data.rows.map(r => {
      if (r.id === selectedRowId) {
        return {
          ...r,
          partners: [...(r.partners || []), newPartner]
        };
      }
      return r;
    });
    triggerChange({ ...data, rows: updatedRows });
  };

  const handlePartnerCardChange = (cardId, field, val) => {
    const updatedRows = data.rows.map(r => {
      if (r.id === selectedRowId) {
        return {
          ...r,
          partners: r.partners.map(p => {
            if (p.id === cardId) {
              return { ...p, [field]: val };
            }
            return p;
          })
        };
      }
      return r;
    });
    triggerChange({ ...data, rows: updatedRows });
  };

  const handleReorderPartners = (newPartners) => {
    const updatedRows = data.rows.map(r => {
      if (r.id === selectedRowId) {
        return {
          ...r,
          partners: newPartners
        };
      }
      return r;
    });
    triggerChange({ ...data, rows: updatedRows });
  };

  const confirmDeleteCard = (cardId) => {
    setDeleteConfirmId(cardId);
  };

  const deletePartnerCard = () => {
    const updatedRows = data.rows.map(r => {
      if (r.id === selectedRowId) {
        return {
          ...r,
          partners: r.partners.filter(p => p.id !== deleteConfirmId)
        };
      }
      return r;
    });
    triggerChange({ ...data, rows: updatedRows });
    setDeleteConfirmId(null);
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading partners...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Partners & Collaborations"
        description="Configure scrolling collaborator tickers. Organize partners into distinct rows with row headings."
        actions={
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 admin-btn-primary py-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Row Group</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Marquee settings & Rows List */}
        <div className="lg:col-span-1 space-y-6">
          {/* General Marquee speed */}
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-4">
            <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Marquee Ticker settings
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-admin-muted uppercase tracking-wider block">
                Scroll Speed
              </label>
              <div className="grid grid-cols-3 gap-2 bg-admin-surface-2 p-1.5 rounded-xl border border-admin-border select-none">
                {['slow', 'medium', 'fast'].map((speedVal) => (
                  <button
                    key={speedVal}
                    onClick={() => handleSettingChange('speed', speedVal)}
                    className={`py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer text-center ${
                      (data.settings?.speed || 'medium') === speedVal
                        ? 'bg-admin-accent text-white'
                        : 'text-admin-muted hover:text-admin-text'
                    }`}
                  >
                    {speedVal}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List of Rows Groups */}
          <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-4">
            <h3 className="text-xs uppercase font-bold text-admin-muted tracking-wider border-b border-admin-border pb-3">
              Partner Row Groups
            </h3>
            
            {(!data.rows || data.rows.length === 0) ? (
              <div className="text-center py-8 text-admin-muted text-xs border border-dashed border-admin-border rounded-xl">
                No rows created yet. Click "Add Row Group" to start.
              </div>
            ) : (
              <div className="space-y-2">
                {data.rows.map((row, idx) => (
                  <button
                    key={row.id}
                    onClick={() => setSelectedRowId(row.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                      selectedRowId === row.id
                        ? 'bg-admin-accent/10 border-admin-accent text-admin-accent font-semibold shadow-md'
                        : 'bg-admin-surface-2 border-admin-border text-admin-text hover:bg-admin-surface-3'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderOpen className="w-4 h-4 shrink-0 opacity-70" />
                      <span className="truncate text-xs">{row.heading || `Row ${idx + 1}`}</span>
                    </div>
                    <span className="text-[10px] bg-admin-surface-3 px-2 py-0.5 rounded-full text-admin-muted font-bold ml-2">
                      {(row.partners || []).length} items
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Cards list for selected row */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedRow ? (
            <div className="glass-panel p-12 rounded-2xl border border-white/[0.04] text-center text-admin-muted">
              Select or add a Partner Row Group from the list on the left to edit its partner cards.
            </div>
          ) : (
            <div className="glass-panel p-6 rounded-2xl border border-white/[0.04] space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-admin-border pb-4 gap-4">
                <div className="flex-1 w-full max-w-lg">
                  <CMSInput
                    label="Row Group Heading / Title"
                    placeholder="e.g. Corporate Partners or Goverment Bodies"
                    value={selectedRow.heading}
                    onChange={(val) => handleRowHeadingChange(selectedRow.id, val)}
                  />
                </div>
                
                <div className="flex gap-3 mt-1.5 w-full sm:w-auto self-end">
                  <button
                    onClick={addPartnerCard}
                    className="flex items-center gap-1.5 admin-btn-secondary py-2.5 px-4 text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Partner Card</span>
                  </button>
                  <button
                    onClick={() => confirmDeleteRow(selectedRow.id)}
                    className="flex items-center gap-1.5 bg-admin-danger/10 text-admin-danger border border-admin-danger/20 hover:bg-admin-danger hover:text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors"
                    title="Delete Row Group"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Row Group</span>
                  </button>
                </div>
              </div>

              {(!selectedRow.partners || selectedRow.partners.length === 0) ? (
                <div className="text-center py-16 text-admin-muted text-xs border border-dashed border-admin-border rounded-xl">
                  No logos added to this row yet. Click "Add Partner Card" to upload a brand logo.
                </div>
              ) : (
                <CMSDragList
                  items={selectedRow.partners}
                  onReorder={handleReorderPartners}
                  keyExtractor={(item) => item.id}
                  renderItem={(partner) => (
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full text-left">
                      <div className="flex-1 w-full">
                        <CMSImageUpload
                          label="Partner Brand Logo"
                          value={partner.logo}
                          onChange={(val) => handlePartnerCardChange(partner.id, 'logo', val)}
                        />
                      </div>

                      <div className="flex items-end justify-between gap-4 shrink-0 pb-1.5 w-full sm:w-auto">
                        <CMSToggle
                          label="Active"
                          checked={partner.active}
                          onChange={(val) => handlePartnerCardChange(partner.id, 'active', val)}
                        />
                        <button
                          onClick={() => confirmDeleteCard(partner.id)}
                          className="p-2.5 rounded-xl bg-admin-danger/10 border border-admin-danger/25 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors shrink-0"
                          title="Delete Logo"
                        >
                          <Trash2 className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    </div>
                  )}
                />
              )}
            </div>
          )}
        </div>
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Partners List & Rows"
      />

      {/* Modal for partner card delete confirmation */}
      <CMSModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Card Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-admin-muted">
            Are you sure you want to remove this partner logo from the row? You will need to click save changes to publish this change.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="admin-btn-secondary py-2 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={deletePartnerCard}
              className="px-4 py-2 bg-admin-danger hover:bg-admin-danger-hi text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Delete Card
            </button>
          </div>
        </div>
      </CMSModal>

      {/* Modal for row deletion confirmation */}
      <CMSModal
        isOpen={deleteRowConfirmId !== null}
        onClose={() => setDeleteRowConfirmId(null)}
        title="Confirm Row Group Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-admin-warning">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="font-bold text-sm">Warning: High Risk Action</span>
          </div>
          <p className="text-sm text-admin-muted">
            Deleting this row group will permanently clear all partner logos uploaded inside of it. Are you sure you want to continue?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteRowConfirmId(null)}
              className="admin-btn-secondary py-2 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={deleteRow}
              className="px-4 py-2 bg-admin-danger hover:bg-admin-danger-hi text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Delete Row Group
            </button>
          </div>
        </div>
      </CMSModal>
    </div>
  );
}
