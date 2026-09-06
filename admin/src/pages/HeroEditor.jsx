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
import { Plus, Trash2, Copy } from 'lucide-react';

export default function HeroEditor() {
  const [data, setData] = useState(null); // data will represent the array of slides directly
  const [isDirty, setIsDirty] = useState(false);
  const [activeSlideId, setActiveSlideId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  // Load Initial Data
  useEffect(() => {
    const loaded = getSectionData('hero');
    // Ensure data is array and inject temporary IDs if they do not exist
    const parsed = (Array.isArray(loaded) ? loaded : []).map((slide, idx) => ({
      ...slide,
      id: slide.id || `slide_${idx}_${Date.now()}`
    }));
    setData(parsed);
  }, []);

  const triggerChange = (updatedSlides) => {
    setData(updatedSlides);
    setIsDirty(true);
    setSectionDirty('hero', true);
  };

  const handleSave = () => {
    // Before saving, we can strip out our temporary `id` keys to keep JSON clean if desired,
    // but leaving them is safe. Let's keep the JSON clean.
    const cleanData = data.map(({ id: _, ...rest }) => rest);
    saveSection('hero', cleanData);
    setIsDirty(false);
    setSectionDirty('hero', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('hero');
    const parsed = (Array.isArray(loaded) ? loaded : []).map((slide, idx) => ({
      ...slide,
      id: slide.id || `slide_${idx}_${Date.now()}`
    }));
    setData(parsed);
    setIsDirty(false);
    setSectionDirty('hero', false);
  };

  const handleSlideChange = (id, field, value) => {
    const updated = data.map((slide) => {
      if (slide.id === id) {
        return { ...slide, [field]: value };
      }
      return slide;
    });
    triggerChange(updated);
  };

  const handleReorder = (newSlides) => {
    triggerChange(newSlides);
  };

  const addSlide = () => {
    if (data.length >= 6) {
      alert('Maximum of 6 slides allowed');
      return;
    }
    const newId = `slide_${Date.now()}`;
    const newSlide = {
      id: newId,
      image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop',
      eyebrow: 'EST. 2006 · INDIA',
      title: 'New Headline Entry',
      subtext: 'Add custom subtext description here.',
      tabName: 'New Slide',
      cta1Label: 'Explore Our Work',
      cta1Link: '/programmes',
      cta2Label: '',
      cta2Link: '',
      status: 'Active',
      duration: 6
    };
    triggerChange([...data, newSlide]);
    setActiveSlideId(newId);
  };

  const duplicateSlide = (slide) => {
    if (data.length >= 6) {
      alert('Maximum of 6 slides allowed');
      return;
    }
    const newId = `slide_${Date.now()}`;
    const duplicated = {
      ...slide,
      id: newId,
      title: `${slide.title} (Copy)`,
      tabName: `${slide.tabName} (Copy)`
    };
    triggerChange([...data, duplicated]);
    setActiveSlideId(newId);
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };

  const deleteSlide = () => {
    const filtered = data.filter((slide) => slide.id !== deleteConfirmId);
    triggerChange(filtered);
    setDeleteConfirmId(null);
    if (activeSlideId === deleteConfirmId) {
      setActiveSlideId(null);
    }
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading slides...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hero Slider Editor"
        description="Configure headlines, button links, background images, and timings for the home page banner slider."
        sectionKey="hero"
        onRollback={(restored) => {
          setData(restored);
          setIsDirty(false);
          setSectionDirty('hero', false);
        }}
        actions={
          <button
            onClick={addSlide}
            disabled={data.length >= 6}
            className="flex items-center gap-1.5 admin-btn-primary py-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Slide ({data.length}/6)</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6">
        <div className="text-xs uppercase font-bold text-admin-muted tracking-wider">
          Drag to Reorder Slider List
        </div>

        <CMSDragList
          items={data}
          onReorder={handleReorder}
          keyExtractor={(item) => item.id}
          renderItem={(slide) => {
            const isOpen = activeSlideId === slide.id;

            return (
              <div className="w-full space-y-4">
                {/* Header Summary Row */}
                <div
                  className="flex items-center justify-between gap-4 cursor-pointer select-none"
                  onClick={() => setActiveSlideId(isOpen ? null : slide.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-16 h-10 object-cover rounded-lg border border-white/10 shrink-0 bg-admin-surface-2"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-sm text-admin-text truncate block">
                        {slide.title || 'Untitled Slide'}
                      </span>
                      <span className="text-xs text-admin-muted font-mono truncate block mt-0.5">
                        Tab Name: {slide.tabName} • Duration: {slide.duration || 6}s • Link: {slide.cta1Link || 'None'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <CMSToggle
                      checked={slide.status === 'Active'}
                      onChange={(val) => handleSlideChange(slide.id, 'status', val ? 'Active' : 'Hidden')}
                      onClick={(e) => e.stopPropagation()} // Stop opening accordion
                    />
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateSlide(slide);
                      }}
                      className="p-1.5 rounded-lg hover:bg-white/5 text-admin-muted hover:text-admin-text transition-colors"
                      title="Duplicate Slide"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(slide.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-admin-danger/10 text-admin-danger/70 hover:text-admin-danger transition-colors"
                      title="Delete Slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Editing Fields (Accordion Panel) */}
                {isOpen && (
                  <div className="border-t border-admin-border pt-4 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    <div className="space-y-4">
                      <CMSImageUpload
                        label="Slide Background Image"
                        value={slide.image}
                        onChange={(val) => handleSlideChange(slide.id, 'image', val)}
                        aspectRatio="16:9"
                        description="Target dimensions: 1920x1080px. High quality, optimized imagery."
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <CMSInput
                          label="Slide Duration (seconds)"
                          type="number"
                          value={slide.duration || 6}
                          onChange={(val) => handleSlideChange(slide.id, 'duration', parseInt(val, 10) || 6)}
                          min={2}
                          max={30}
                        />
                        <div className="flex flex-col justify-end pb-1.5">
                          <CMSToggle
                            label="Slide Status"
                            description="Visible in slider list"
                            checked={slide.status === 'Active'}
                            onChange={(val) => handleSlideChange(slide.id, 'status', val ? 'Active' : 'Hidden')}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <CMSInput
                          label="Section Eyebrow"
                          value={slide.eyebrow}
                          onChange={(val) => handleSlideChange(slide.id, 'eyebrow', val)}
                          maxLength={30}
                          placeholder="EST. 2006 · INDIA"
                        />
                        <CMSInput
                          label="Tab Pill Name"
                          value={slide.tabName}
                          onChange={(val) => handleSlideChange(slide.id, 'tabName', val)}
                          maxLength={20}
                          placeholder="01. Community"
                        />
                      </div>

                      <CMSInput
                        label="Headline Text"
                        value={slide.title}
                        onChange={(val) => handleSlideChange(slide.id, 'title', val)}
                        maxLength={60}
                        placeholder="Welcome to Lakshya NGO"
                      />

                      <CMSTextarea
                        label="Subtext"
                        value={slide.subtext}
                        onChange={(val) => handleSlideChange(slide.id, 'subtext', val)}
                        maxLength={120}
                        rows={2}
                        placeholder="Enter brief description slide subtext"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <CMSInput
                          label="CTA Button 1 Label"
                          value={slide.cta1Label}
                          onChange={(val) => handleSlideChange(slide.id, 'cta1Label', val)}
                          maxLength={20}
                        />
                        <CMSInput
                          label="CTA Button 1 Link"
                          value={slide.cta1Link}
                          onChange={(val) => handleSlideChange(slide.id, 'cta1Link', val)}
                          placeholder="/about or URL"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <CMSInput
                          label="CTA Button 2 Label (Optional)"
                          value={slide.cta2Label || ''}
                          onChange={(val) => handleSlideChange(slide.id, 'cta2Label', val)}
                          maxLength={20}
                        />
                        <CMSInput
                          label="CTA Button 2 Link (Optional)"
                          value={slide.cta2Link || ''}
                          onChange={(val) => handleSlideChange(slide.id, 'cta2Link', val)}
                          placeholder="/contact or URL"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>

      {/* Global save notifications */}
      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Hero Slider"
      />

      {/* Delete Confirmation Modal */}
      <CMSModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Slide Warning"
        actions={
          <>
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="admin-btn-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              onClick={deleteSlide}
              className="admin-btn-danger py-1.5 text-xs"
            >
              Delete Slide
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this slide? This will remove the slide from the home page. This action can be undone by discarding changes before saving.</p>
      </CMSModal>
    </div>
  );
}
