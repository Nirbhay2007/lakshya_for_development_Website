import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSDragList from '../components/ui/CMSDragList';
import CMSInput from '../components/ui/CMSInput';
import CMSToggle from '../components/ui/CMSToggle';
import CMSTextarea from '../components/ui/CMSTextarea';
import CMSImageUpload from '../components/ui/CMSImageUpload';
import CMSModal from '../components/ui/CMSModal';
import { Plus, Trash2, Briefcase } from 'lucide-react';

export default function CareersEditor() {
  const [data, setData] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('careers');
    if (loaded && loaded.hero && loaded.intro && Array.isArray(loaded.jobs)) {
      const normalized = {
        ...loaded,
        volunteer: loaded.volunteer || {
          active: true,
          title: 'Become a Volunteer',
          description: 'If you don\'t find a matching vacancy but still wish to dedicate your time to childhood education or plantation projects, fill out our quick application below.',
          buttonText: 'Submit Application',
          successMessage: 'Thank you! Your volunteer application has been received successfully.',
          interests: [
            'Teaching / Education',
            'Environmental & Forestry',
            'Women Empowerment',
            'Campaigns & Events',
            'Operations & Support'
          ]
        }
      };
      setData(normalized);
    } else {
      setData({
        hero: {
          title: 'Join Our Mission',
          subtitle: 'Work with us to promote social progress and environmental sustainability.',
          bgImage: '',
        },
        intro: {
          title: 'Why Build Your Career at Lakshya?',
          description:
            "At Lakshya NGO, we believe in community empowerment and environmental action. We provide an inclusive, passionate, and collaborative work environment where every individual can make a tangible difference in the field.",
        },
        jobs: [],
        volunteer: {
          active: true,
          title: 'Become a Volunteer',
          description: 'If you don\'t find a matching vacancy but still wish to dedicate your time to childhood education or plantation projects, fill out our quick application below.',
          buttonText: 'Submit Application',
          successMessage: 'Thank you! Your volunteer application has been received successfully.',
          interests: [
            'Teaching / Education',
            'Environmental & Forestry',
            'Women Empowerment',
            'Campaigns & Events',
            'Operations & Support'
          ]
        }
      });
    }
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('careers', true);
  };

  const handleSave = () => {
    saveSection('careers', data);
    setIsDirty(false);
    setSectionDirty('careers', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('careers');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('careers', false);
  };

  const handleHeroChange = (field, value) => {
    triggerChange({
      ...data,
      hero: {
        ...data.hero,
        [field]: value,
      },
    });
  };

  const handleIntroChange = (field, value) => {
    triggerChange({
      ...data,
      intro: {
        ...data.intro,
        [field]: value,
      },
    });
  };

  const handleVolunteerChange = (field, value) => {
    triggerChange({
      ...data,
      volunteer: {
        ...data.volunteer,
        [field]: value,
      },
    });
  };

  const handleVolunteerInterestsChange = (interestsArray) => {
    triggerChange({
      ...data,
      volunteer: {
        ...data.volunteer,
        interests: interestsArray,
      },
    });
  };

  const handleJobChange = (id, field, value) => {
    const updatedJobs = data.jobs.map((job) => {
      if (job.id === id) {
        return { ...job, [field]: value };
      }
      return job;
    });
    triggerChange({
      ...data,
      jobs: updatedJobs,
    });
  };

  const handleReorderJobs = (newJobs) => {
    triggerChange({
      ...data,
      jobs: newJobs,
    });
  };

  const addJob = () => {
    const newId = `job_${Date.now()}`;
    const newJob = {
      id: newId,
      title: 'New Position Title',
      type: 'Full-Time',
      location: 'Lucknow, Uttar Pradesh',
      description: 'Role responsibilities and description...',
      requirements: 'Requirements and qualifications...',
      applyUrl: '',
      active: true,
      publishDate: '',
    };
    triggerChange({
      ...data,
      jobs: [...data.jobs, newJob],
    });
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const deleteJob = () => {
    const filtered = data.jobs.filter((j) => j.id !== deleteConfirmId);
    triggerChange({
      ...data,
      jobs: filtered,
    });
    setDeleteConfirmId(null);
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading Careers...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Careers Page Editor"
        description="Add and configure active job listings, descriptions, qualifications, and page banners."
        actions={
          <button onClick={addJob} className="flex items-center gap-1.5 admin-btn-primary py-2 text-xs">
            <Plus className="w-4 h-4" />
            <span>Add Position</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Hero & Intro Settings */}
        <div className="space-y-6 lg:col-span-1">
          {/* Banner Settings */}
          <div className="glass-panel p-6 rounded-2xl border border-admin-border space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-admin-text border-b border-admin-border pb-2">
              Page Header Banner
            </h2>
            <CMSInput
              label="Banner Title"
              value={data.hero.title}
              onChange={(val) => handleHeroChange('title', val)}
            />
            <CMSTextarea
              label="Banner Subtitle"
              value={data.hero.subtitle}
              onChange={(val) => handleHeroChange('subtitle', val)}
              rows={2}
            />
            <CMSImageUpload
              label="Banner Background Image"
              value={data.hero.bgImage}
              onChange={(val) => handleHeroChange('bgImage', val)}
            />
          </div>

          {/* Intro settings */}
          <div className="glass-panel p-6 rounded-2xl border border-admin-border space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-admin-text border-b border-admin-border pb-2">
              Introductory Culture Section
            </h2>
            <CMSInput
              label="Culture Heading"
              value={data.intro.title}
              onChange={(val) => handleIntroChange('title', val)}
            />
            <CMSTextarea
              label="Culture Description"
              value={data.intro.description}
              onChange={(val) => handleIntroChange('description', val)}
              rows={5}
            />
          </div>

          {/* Volunteer Form Settings */}
          <div className="glass-panel p-6 rounded-2xl border border-admin-border space-y-4">
            <div className="flex justify-between items-center border-b border-admin-border pb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-admin-text">
                Volunteer Form Settings
              </h2>
              <CMSToggle
                checked={data.volunteer ? data.volunteer.active : true}
                onChange={(val) => handleVolunteerChange('active', val)}
              />
            </div>
            
            {(data.volunteer ? data.volunteer.active : true) && (
              <>
                <CMSInput
                  label="Form Title"
                  value={data.volunteer ? data.volunteer.title : 'Become a Volunteer'}
                  onChange={(val) => handleVolunteerChange('title', val)}
                />
                <CMSTextarea
                  label="Form Subtitle / Intro"
                  value={data.volunteer ? data.volunteer.description : ''}
                  onChange={(val) => handleVolunteerChange('description', val)}
                  rows={3}
                />
                <CMSInput
                  label="Submit Button Text"
                  value={data.volunteer ? (data.volunteer.buttonText || 'Submit Application') : 'Submit Application'}
                  onChange={(val) => handleVolunteerChange('buttonText', val)}
                />
                <CMSInput
                  label="Success Message Alert"
                  value={data.volunteer ? (data.volunteer.successMessage || '') : ''}
                  onChange={(val) => handleVolunteerChange('successMessage', val)}
                />
                <CMSTextarea
                  label="Interests Options (Comma-Separated)"
                  placeholder="e.g. Teaching / Education, Campaigns, Environmental & Forestry"
                  value={data.volunteer && data.volunteer.interests ? data.volunteer.interests.join(', ') : ''}
                  onChange={(val) => handleVolunteerInterestsChange(val.split(',').map(s => s.trim()).filter(Boolean))}
                  rows={2}
                />
              </>
            )}
          </div>
        </div>

        {/* Right Column: Positions List */}
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-panel p-6 rounded-2xl border border-admin-border space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-admin-text border-b border-admin-border pb-2">
              Active Job Listings ({data.jobs.length})
            </h2>

            {data.jobs.length === 0 ? (
              <div className="text-center py-12 text-admin-muted border border-dashed border-admin-border rounded-xl">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-xs">No active positions added yet. Click "Add Position" above to begin.</p>
              </div>
            ) : (
              <CMSDragList
                items={data.jobs}
                onReorder={handleReorderJobs}
                keyExtractor={(item) => item.id}
                renderItem={(job) => (
                  <div className="flex flex-col gap-3 w-full text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <CMSInput
                        label="Position Title"
                        value={job.title}
                        onChange={(val) => handleJobChange(job.id, 'title', val)}
                      />
                      <CMSInput
                        label="Job Type"
                        placeholder="e.g. Full-Time, Volunteer"
                        value={job.type}
                        onChange={(val) => handleJobChange(job.id, 'type', val)}
                      />
                      <CMSInput
                        label="Location"
                        placeholder="e.g. Lucknow, India"
                        value={job.location}
                        onChange={(val) => handleJobChange(job.id, 'location', val)}
                      />
                    </div>

                    <CMSTextarea
                      label="Job Summary / Description"
                      value={job.description}
                      onChange={(val) => handleJobChange(job.id, 'description', val)}
                      rows={2}
                    />

                    <CMSTextarea
                      label="Requirements & Qualifications"
                      value={job.requirements}
                      onChange={(val) => handleJobChange(job.id, 'requirements', val)}
                      rows={2}
                    />

                    <CMSInput
                      label="Apply Link / Form URL (Optional)"
                      placeholder="e.g. https://forms.google.com/... (Defaults to Contact Page if empty)"
                      value={job.applyUrl || ''}
                      onChange={(val) => handleJobChange(job.id, 'applyUrl', val)}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-3 mt-1">
                      <div className="space-y-1">
                        <CMSInput
                          type="date"
                          label="Scheduled Publish Date (Optional)"
                          value={job.publishDate || ''}
                          onChange={(val) => handleJobChange(job.id, 'publishDate', val)}
                          description="Keep empty to publish immediately."
                        />
                        {job.publishDate && new Date(job.publishDate) > new Date() ? (
                          <span className="text-[11px] text-admin-amber font-semibold flex items-center gap-1 mt-1">
                            ⚠️ Scheduled to publish on {job.publishDate}
                          </span>
                        ) : job.publishDate ? (
                          <span className="text-[11px] text-forest-500 font-semibold flex items-center gap-1 mt-1">
                            ✓ Published on {job.publishDate}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between pt-4 sm:pt-6">
                        <CMSToggle
                          label="Active Position"
                          description="Visible in Careers listing page"
                          checked={job.active}
                          onChange={(val) => handleJobChange(job.id, 'active', val)}
                        />
                        <button
                          onClick={() => confirmDelete(job.id)}
                          className="p-2 rounded-xl bg-admin-danger/10 border border-admin-danger/20 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors"
                          title="Delete Position"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              />
            )}
          </div>
        </div>
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Careers Listings Grid"
      />

      <CMSModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-admin-muted">
            Are you sure you want to permanently delete this job listing? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="admin-btn-secondary py-2 px-4 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={deleteJob}
              className="px-4 py-2 bg-admin-danger hover:bg-admin-danger-hi text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Delete Listing
            </button>
          </div>
        </div>
      </CMSModal>
    </div>
  );
}
