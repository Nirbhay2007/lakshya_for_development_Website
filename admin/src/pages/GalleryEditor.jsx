import React, { useState, useEffect } from 'react';
import { getSectionData, saveSection } from '../store/dataSync';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import SaveBar from '../components/ui/SaveBar';
import CMSInput from '../components/ui/CMSInput';
import CMSToggle from '../components/ui/CMSToggle';
import CMSImageUpload from '../components/ui/CMSImageUpload';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Plus, Trash2, Video, Image as ImageIcon, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const DEFAULT_CATEGORIES = ['Adhaar', 'Vaidehi', 'Yagna', 'Events', 'General'];

export default function GalleryEditor() {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('images');
  const [isDirty, setIsDirty] = useState(false);
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  const setSectionDirty = useAdminStore((state) => state.setSectionDirty);

  useEffect(() => {
    const loaded = getSectionData('gallery');
    setData(loaded);

    const settings = getSectionData('settings');
    if (settings && settings.categories && Array.isArray(settings.categories)) {
      setCategories(settings.categories);
    }
  }, []);

  const triggerChange = (updatedData) => {
    setData(updatedData);
    setIsDirty(true);
    setSectionDirty('gallery', true);
  };

  const handleSave = () => {
    saveSection('gallery', data);
    setIsDirty(false);
    setSectionDirty('gallery', false);
  };

  const handleDiscard = () => {
    const loaded = getSectionData('gallery');
    setData(loaded);
    setIsDirty(false);
    setSectionDirty('gallery', false);
  };

  // Image actions
  const handleImageChange = (id, field, value) => {
    const updatedImages = data.images.map((img) => {
      if (img.id === id) {
        return { ...img, [field]: value };
      }
      return img;
    });
    triggerChange({ ...data, images: updatedImages });
  };

  const deleteImage = (id) => {
    const filtered = data.images.filter((img) => img.id !== id);
    triggerChange({ ...data, images: filtered });
  };

  // Bulk Image Drops Helper
  const onDropImages = async (files) => {
    if (!files.length) return;
    setIsUploadingBulk(true);
    setUploadProgress(0);

    const newImages = [...data.images];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const options = {
          maxSizeMB: 0.1, // Compress to max 100KB
          maxWidthOrHeight: 900,
          useWebWorker: true
        };
        const compressed = await imageCompression(file, options);
        
        // Upload to server
        const formData = new FormData();
        formData.append('file', compressed, file.name);

        const authPinHash = useAdminStore.getState().pinHash;

        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            'x-cms-pin-hash': authPinHash
          },
          body: formData
        });

        const uploadData = await response.json();

        if (uploadData.success) {
          // Add to Gallery
          newImages.push({
            id: `img_${Date.now()}_${i}`,
            image: uploadData.url,
            url: uploadData.url,
            alt: file.name.split('.')[0] || 'Gallery Image',
            category: 'General',
            caption: '',
            featured: false,
            active: true
          });

          // Add to Media Library
          const newMedia = {
            id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            size: compressed.size,
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric'
            }),
            type: 'image',
            url: uploadData.url
          };
          useAdminStore.getState().addMediaFile(newMedia);
        } else {
          console.error('Failed to upload bulk file:', uploadData.message);
          toast.error(`Failed to upload ${file.name}`);
        }
      } catch (err) {
        console.error('Failed to process bulk file', err);
        toast.error(`Error processing ${file.name}`);
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    triggerChange({ ...data, images: newImages });
    setIsUploadingBulk(false);
    setUploadProgress(0);
    toast.success(`Uploaded ${files.length} images to Gallery`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropImages,
    accept: { 'image/*': [] }
  });

  // Video Actions
  const handleVideoChange = (id, field, value) => {
    const updatedVideos = data.videos.map((vid) => {
      if (vid.id === id) {
        return { ...vid, [field]: value };
      }
      return vid;
    });
    triggerChange({ ...data, videos: updatedVideos });
  };

  const addVideo = () => {
    const newVideo = {
      id: `vid_${Date.now()}`,
      youtubeUrl: '',
      title: 'New Video Story',
      category: 'General',
      active: true,
      thumbnail: ''
    };
    triggerChange({ ...data, videos: [...data.videos, newVideo] });
  };

  const deleteVideo = (id) => {
    const filtered = data.videos.filter((vid) => vid.id !== id);
    triggerChange({ ...data, videos: filtered });
  };

  if (!data) return <div className="text-center py-12 text-admin-muted text-sm">Loading gallery...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gallery Editor"
        description="Manage media galleries, upload image catalogs, select filters, toggle featured visibility, and update YouTube video highlights."
      />

      {/* Tabs */}
      <div className="flex border-b border-admin-border gap-2 select-none overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'images'
              ? 'border-admin-accent text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Images Grid ({data.images.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'videos'
              ? 'border-admin-accent text-admin-accent-hi'
              : 'border-transparent text-admin-muted hover:text-admin-text'
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Videos List ({data.videos.length})</span>
        </button>
      </div>

      {/* Tab views */}
      <div className="pt-2">
        {activeTab === 'images' && (
          <div className="space-y-6">
            {/* Bulk Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                isDragActive 
                  ? 'border-admin-accent bg-admin-accent/5' 
                  : 'border-admin-border bg-admin-surface-2/20 hover:border-admin-border-hi'
              }`}
            >
              <input {...getInputProps()} />
              {isUploadingBulk ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-4 border-admin-border border-t-admin-accent animate-spin mb-3" />
                  <span className="text-sm font-semibold text-admin-text">Processing and compressing batch ({uploadProgress}%)</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-admin-muted mx-auto mb-2 shrink-0" />
                  <p className="text-sm font-semibold text-admin-text">Drag & drop multiple images to upload in bulk</p>
                  <p className="text-xs text-admin-muted mt-1">Images are compressed automatically for local storage.</p>
                </>
              )}
            </div>

            {/* Masonry/Grid list */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.images.map((img) => (
                <div
                  key={img.id}
                  className="glass-panel rounded-2xl border border-white/[0.04] overflow-hidden flex flex-col justify-between"
                >
                  <div className="w-full aspect-video overflow-hidden relative bg-black/25">
                    <img
                      src={img.image || img.url}
                      alt={img.alt}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <button
                      onClick={() => deleteImage(img.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/75 hover:bg-admin-danger hover:text-white text-admin-muted transition-colors border border-white/10"
                      title="Delete Image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-end justify-between gap-3">
                      <div className="flex flex-col gap-1 flex-grow min-w-0">
                        <label className="text-[10px] uppercase font-bold text-admin-muted tracking-wider">Category</label>
                        <select
                          className="glass-input rounded-xl px-2 py-1.5 text-xs text-admin-text cursor-pointer w-full"
                          value={img.category}
                          onChange={(e) => handleImageChange(img.id, 'category', e.target.value)}
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2.5 pb-1 shrink-0">
                        <CMSToggle
                          label="Active"
                          checked={img.active}
                          onChange={(val) => handleImageChange(img.id, 'active', val)}
                        />
                        <CMSToggle
                          label="Featured"
                          checked={img.featured || false}
                          onChange={(val) => handleImageChange(img.id, 'featured', val)}
                        />
                      </div>
                    </div>

                    <CMSInput
                      label="Alt Text (a11y)"
                      value={img.alt}
                      onChange={(val) => handleImageChange(img.id, 'alt', val)}
                      placeholder="Image alt description"
                    />
                    
                    <CMSInput
                      label="Caption Text"
                      value={img.caption || ''}
                      onChange={(val) => handleImageChange(img.id, 'caption', val)}
                      placeholder="Optional banner caption text"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between border-b border-admin-border pb-3">
              <span className="text-xs uppercase font-bold text-admin-muted tracking-wider">Video highlights</span>
              <button
                onClick={addVideo}
                className="flex items-center gap-1 admin-btn-secondary py-1 text-xs"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Add Video Entry</span>
              </button>
            </div>

            <div className="space-y-4">
              {data.videos.map((vid) => (
                <div
                  key={vid.id}
                  className="glass-panel p-4 rounded-2xl border border-white/[0.04] flex flex-col md:flex-row gap-4 justify-between"
                >
                  <div className="w-full md:w-48 shrink-0">
                    <CMSImageUpload
                      label="Custom Thumbnail"
                      value={vid.thumbnail}
                      onChange={(val) => handleVideoChange(vid.id, 'thumbnail', val)}
                      aspectRatio="16:9"
                      description="Cover card preview"
                    />
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CMSInput
                        label="Video Title"
                        value={vid.title}
                        onChange={(val) => handleVideoChange(vid.id, 'title', val)}
                        maxLength={60}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-admin-muted uppercase tracking-wider">Category</label>
                          <select
                            className="glass-input rounded-xl px-2 py-2.5 text-sm text-admin-text cursor-pointer"
                            value={vid.category}
                            onChange={(e) => handleVideoChange(vid.id, 'category', e.target.value)}
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end justify-center pb-2.5">
                          <CMSToggle
                            label="Active"
                            checked={vid.active}
                            onChange={(val) => handleVideoChange(vid.id, 'active', val)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <CMSInput
                        label="YouTube URL"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={vid.youtubeUrl}
                        onChange={(val) => handleVideoChange(vid.id, 'youtubeUrl', val)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-admin-border justify-end">
                    <button
                      onClick={() => deleteVideo(vid.id)}
                      className="p-2.5 rounded-xl bg-admin-danger/10 border border-admin-danger/25 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors"
                      title="Delete video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SaveBar
        isDirty={isDirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
        sectionName="Gallery media"
      />
    </div>
  );
}
