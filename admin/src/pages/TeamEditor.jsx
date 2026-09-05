import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSDragList from '../components/ui/CMSDragList';
import CMSInput from '../components/ui/CMSInput';
import CMSTextarea from '../components/ui/CMSTextarea';
import CMSToggle from '../components/ui/CMSToggle';
import CMSImageUpload from '../components/ui/CMSImageUpload';
import CMSModal from '../components/ui/CMSModal';
import { Plus, Trash2 } from 'lucide-react';

const DEFAULT_DEPARTMENTS = ['Leadership', 'Programme', 'Operations', 'Communications'];

export default function TeamEditor() {
  const [data, setData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [departments, setDepartments] = useState(DEFAULT_DEPARTMENTS);
  
  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('team');
    if (loaded && !Array.isArray(loaded)) {
      if (loaded.members && Array.isArray(loaded.members)) {
        setData(loaded.members);
      } else {
        setData([]);
      }
    } else {
      setData(loaded || []);
    }

    const settings = getSectionData('settings');
    if (settings && settings.departments && Array.isArray(settings.departments)) {
      setDepartments(settings.departments);
    }
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('team', true);
  };

  const handleSave = () => {
    saveSection('team', data);
    setIsDirty(false);
    setSectionDirty('team', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('team');
    if (loaded && !Array.isArray(loaded)) {
      if (loaded.members && Array.isArray(loaded.members)) {
        setData(loaded.members);
      } else {
        setData([]);
      }
    } else {
      setData(loaded || []);
    }
    setIsDirty(false);
    setSectionDirty('team', false);
  };

  const handleMemberChange = (id, field, value) => {
    const updated = data.map((m) => {
      if (m.id === id) {
        return { ...m, [field]: value };
      }
      return m;
    });
    triggerChange(updated);
  };

  const handleReorder = (newMembers) => {
    triggerChange(newMembers);
  };

  const addMember = () => {
    const newId = `member_${Date.now()}`;
    const newMember = {
      id: newId,
      name: 'New Member Name',
      role: 'Project Volunteer',
      image: '',
      bio: '',
      linkedin: '',
      whatsapp: '',
      department: departments[0] || 'Programme',
      active: true
    };
    triggerChange([...data, newMember]);
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const deleteMember = () => {
    const filtered = data.filter((m) => m.id !== deleteConfirmId);
    triggerChange(filtered);
    setDeleteConfirmId(null);
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading team...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Grid Editor"
        description="Add, edit, reorder, and configure NGO staff, board members, and program leads. Team photos auto-crop to 1:1."
        actions={
          <button
            onClick={addMember}
            className="flex items-center gap-1.5 admin-btn-primary py-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        }
      />

      <div className="space-y-4 max-w-4xl">
        <div className="text-xs uppercase font-bold text-admin-muted tracking-wider">
          Drag to Reorder Team Members
        </div>

        <CMSDragList
          items={data}
          onReorder={handleReorder}
          keyExtractor={(item) => item.id}
          renderItem={(member) => (
            <div className="flex flex-col sm:flex-row gap-4 items-start w-full">
              {/* Photo Box */}
              <div className="w-20 shrink-0">
                <CMSImageUpload
                  value={member.image}
                  onChange={(val) => handleMemberChange(member.id, 'image', val)}
                  aspectRatio="1:1"
                  compact={true}
                />
              </div>

              {/* Editing details */}
              <div className="flex-1 space-y-3 text-left w-full">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <CMSInput
                    label="Full Name"
                    value={member.name}
                    onChange={(val) => handleMemberChange(member.id, 'name', val)}
                    maxLength={40}
                  />

                  <CMSInput
                    label="Role / Title"
                    value={member.role || ''}
                    onChange={(val) => handleMemberChange(member.id, 'role', val)}
                    maxLength={40}
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-admin-muted uppercase tracking-wider">
                      Department
                    </label>
                    <select
                      className="glass-input rounded-xl px-3 py-2.5 text-sm text-admin-text cursor-pointer"
                      value={member.department}
                      onChange={(e) => handleMemberChange(member.id, 'department', e.target.value)}
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CMSInput
                    label="LinkedIn Profile Link (Optional)"
                    placeholder="https://linkedin.com/in/..."
                    value={member.linkedin || ''}
                    onChange={(val) => handleMemberChange(member.id, 'linkedin', val)}
                  />
                  <CMSInput
                    label="WhatsApp Link / Number (Optional)"
                    placeholder="+91 XXXXX XXXXX"
                    value={member.whatsapp || ''}
                    onChange={(val) => handleMemberChange(member.id, 'whatsapp', val)}
                  />
                </div>


                <div className="flex items-end justify-between pb-1 pt-1">
                  <CMSToggle
                    label="Active Member"
                    description="Visible in Team Page grids"
                    checked={member.active}
                    onChange={(val) => handleMemberChange(member.id, 'active', val)}
                  />
                  <button
                    onClick={() => confirmDelete(member.id)}
                    className="p-2.5 rounded-xl bg-admin-danger/10 border border-admin-border text-admin-danger hover:bg-admin-danger hover:text-white transition-colors"
                    title="Delete Member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <CMSTextarea
                  label="Short Biography / Bio (Optional)"
                  placeholder="Tell us about their background and involvement..."
                  value={member.bio || ''}
                  onChange={(val) => handleMemberChange(member.id, 'bio', val)}
                  maxLength={200}
                  rows={2}
                />
              </div>
            </div>
          )}
        />
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Team Members Grid"
      />

      <CMSModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Team Member Warning"
        actions={
          <>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="admin-btn-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={deleteMember}
              className="admin-btn-danger py-1.5 text-xs"
            >
              Delete Member
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this team member? This removes their card from the team directories. You must click save changes below to commit.</p>
      </CMSModal>
    </div>
  );
}
