import React, { useState, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAdminStore } from '../store/useAdminStore';
import PageHeader from '../components/layout/PageHeader';
import CMSModal from '../components/ui/CMSModal';
import {
  Upload,
  Search,
  Grid,
  List,
  Copy,
  Trash2,
  FileText,
  CheckCircle,
  Info,
  HardDrive,
  Crop
} from 'lucide-react';
import ImageCropperModal from '../components/ui/ImageCropperModal';

export default function MediaLibrary() {
  const mediaFiles = useAdminStore((state) => state.mediaFiles);
  const addMediaFile = useAdminStore((state) => state.addMediaFile);
  const deleteMediaFile = useAdminStore((state) => state.deleteMediaFile);
  const logActivity = useAdminStore((state) => state.logActivity);

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'image' | 'document'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cropTarget, setCropTarget] = useState(null);

  // Compute IndexedDB utilization
  const storageUtilization = useMemo(() => {
    const bytesUsed = mediaFiles.reduce((acc, file) => acc + (file.size || 0), 0);
    const limitBytes = 7 * 1024 * 1024 * 1024; // 7GB
    const gbUsed = (bytesUsed / (1024 * 1024 * 1024)).toFixed(3);
    const mbUsed = (bytesUsed / (1024 * 1024)).toFixed(2);
    const percentage = Math.min((bytesUsed / limitBytes) * 100, 100).toFixed(2);
    return { gbUsed, mbUsed, percentage, bytesUsed };
  }, [mediaFiles]);

  const handleCopyLink = (text, id) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch((err) => {
          console.warn('Clipboard API failed, trying fallback:', err);
          fallbackCopyText(text, id);
        });
    } else {
      fallbackCopyText(text, id);
    }
  };

  const fallbackCopyText = (text, id) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        console.error('Fallback copy was unsuccessful');
      }
    } catch (err) {
      console.error('Fallback copy error:', err);
    }
    document.body.removeChild(textArea);
  };

  // Upload actions
  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles.length) return;
    setIsUploading(true);
    const authPinHash = useAdminStore.getState().pinHash;

    for (const file of acceptedFiles) {
      try {
        const isImg = file.type.startsWith('image/');
        let finalUrl = '';
        let fileSize = file.size;

        if (isImg) {
          const formData = new FormData();
          formData.append('file', file);
          const response = await fetch('/api/media/upload', {
            method: 'POST',
            headers: {
              'x-cms-pin-hash': authPinHash
            },
            body: formData
          });
          const data = await response.json();
          if (data.success) {
            finalUrl = data.url;
            // The file size on server is smaller, but we just use original size for display purposes, 
            // or we could get size from server if we updated the endpoint. Let's use original file size for now.
          } else {
            throw new Error(data.message || 'Upload failed');
          }
        } else {
          // Parse documents as base64 dataurl (PDFs etc)
          finalUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
          });
        }

        const newMedia = {
          id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: fileSize,
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          }),
          type: isImg ? 'image' : 'document',
          url: finalUrl
        };

        addMediaFile(newMedia);
        logActivity('Created', 'Media Library', `Uploaded asset file: ${file.name}`);
      } catch (err) {
        console.error('Failed to process uploaded file', err);
        alert(`Failed to upload ${file.name}`);
      }
    }
    setIsUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'image/*': [],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  });

  // Filtered file arrays
  const filteredFiles = useMemo(() => {
    return mediaFiles.filter((file) => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'all' || file.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [mediaFiles, searchQuery, filterType]);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Asset Library"
        description="Upload images, branding graphics, and PDF files. Copies Base64 URLs to insert directly inside rich text links."
      />

      {/* Storage and upload bar layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Upload Zone */}
        <div className="md:col-span-2">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragActive
                ? 'border-admin-accent bg-admin-accent/5'
                : 'border-admin-border bg-admin-surface-2/20 hover:border-admin-border-hi'
            }`}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-9 h-9 rounded-full border-4 border-admin-border border-t-admin-accent animate-spin mb-3" />
                <span className="text-xs font-semibold text-admin-text">Uploading and compressing assets...</span>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-admin-muted mx-auto mb-2 shrink-0" />
                <p className="text-xs font-semibold text-admin-text">
                  Drag and drop files here, or <span className="text-admin-accent-hi">browse</span>
                </p>
                <p className="text-[10px] text-admin-muted mt-1">
                  Supports JPEG, PNG, WEBP, GIF, PDF (Max 50MB)
                </p>
              </>
            )}
          </div>
        </div>

        {/* IndexedDB Storage Meter */}
        <div className="md:col-span-1">
          <div className="glass-panel p-4 rounded-2xl border border-white/[0.04] space-y-4">
            <div className="flex items-center gap-2 text-admin-accent-hi border-b border-admin-border pb-2.5 select-none">
              <HardDrive className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Quota allocation</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-admin-muted font-medium">Media Storage Limit</span>
                <span className="font-mono font-bold text-admin-text text-right">
                  {storageUtilization.bytesUsed < 1024 * 1024 
                    ? `${storageUtilization.mbUsed} MB` 
                    : `${storageUtilization.gbUsed} GB`} / 7.0 GB
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-admin-surface rounded-full h-2 overflow-hidden border border-admin-border">
                <div
                  className={`h-2 transition-all duration-300 ${
                    parseFloat(storageUtilization.percentage) > 80
                      ? 'bg-admin-danger'
                      : parseFloat(storageUtilization.percentage) > 50
                      ? 'bg-admin-amber'
                      : 'bg-admin-accent-hi'
                  }`}
                  style={{ width: `${storageUtilization.percentage}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-admin-muted font-semibold uppercase">
                <span>Used: {storageUtilization.percentage}%</span>
                <span>Limit: 7GB</span>
              </div>
            </div>
            
            <p className="text-[9px] text-admin-muted/80 leading-normal">
              Assets are stored securely on the live server. You can copy URLs to embed inside site sections.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and search actions header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-admin-surface p-4 rounded-2xl border border-admin-border select-none">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input rounded-xl pl-9 pr-4 py-2 text-xs text-admin-text w-full"
          />
        </div>

        {/* Filter Type & View Switch */}
        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'image', label: 'Images' },
              { id: 'document', label: 'Docs' }
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  filterType === t.id
                    ? 'bg-white/10 text-admin-text border border-white/10'
                    : 'text-admin-muted hover:text-admin-text border border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="w-[1px] h-5 bg-admin-border" />

          {/* View toggle Buttons */}
          <div className="flex bg-admin-surface-2 p-1 rounded-xl border border-admin-border shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-admin-accent text-white' : 'text-admin-muted hover:text-admin-text'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-admin-accent text-white' : 'text-admin-muted hover:text-admin-text'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RENDER FILES VIEWPORT */}
      {filteredFiles.length > 0 ? (
        viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="group glass-panel rounded-2xl border border-white/[0.04] overflow-hidden flex flex-col justify-between hover:border-admin-accent/35 hover:shadow-xl transition-all"
              >
                {/* Thumb */}
                <div
                  onClick={() => setSelectedFile(file)}
                  className="aspect-square bg-black/35 relative flex items-center justify-center overflow-hidden cursor-pointer"
                >
                  {file.type === 'image' ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <FileText className="w-10 h-10 text-admin-muted" />
                  )}
                  
                  {/* Hover detail overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-admin-accent py-1 px-3 rounded-lg flex items-center gap-1 shadow-lg">
                      <Info className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </span>
                  </div>
                </div>

                {/* Footer details info */}
                <div className="p-3 border-t border-admin-border bg-black/10 flex flex-col gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-admin-text truncate block select-all">
                    {file.name}
                  </span>
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] text-admin-muted font-mono block">
                      {formatBytes(file.size)}
                    </span>
                    
                    <button
                      onClick={() => handleCopyLink(file.url, file.id)}
                      className={`p-1 rounded hover:bg-white/5 border border-transparent transition-all flex items-center gap-0.5 ${
                        copiedId === file.id ? 'text-green-400 border-green-500/20 bg-green-500/10' : 'text-admin-muted hover:text-admin-text'
                      }`}
                      title="Copy Data URL"
                    >
                      {copiedId === file.id ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="glass-panel rounded-2xl border border-white/[0.04] overflow-hidden divide-y divide-admin-border">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="p-3 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div
                  onClick={() => setSelectedFile(file)}
                  className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                >
                  <div className="w-12 h-12 rounded-lg border border-admin-border bg-black/25 overflow-hidden flex items-center justify-center shrink-0">
                    {file.type === 'image' ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-5 h-5 text-admin-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-admin-text block truncate select-all">{file.name}</span>
                    <span className="text-[10px] text-admin-muted block mt-0.5">
                      Uploaded: {file.date}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-xs">
                  <span className="font-mono text-admin-muted">{formatBytes(file.size)}</span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyLink(file.url, file.id)}
                      className={`p-1.5 rounded-lg border border-transparent transition-all flex items-center gap-1 text-xs ${
                        copiedId === file.id
                          ? 'text-green-400 border-green-500/20 bg-green-500/10'
                          : 'text-admin-muted hover:text-admin-text bg-white/5 border-admin-border'
                      }`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedId === file.id ? 'Copied' : 'Copy link'}</span>
                    </button>

                    <button
                      onClick={() => deleteMediaFile(file.id)}
                      className="p-1.5 rounded-lg bg-admin-danger/10 border border-admin-danger/25 text-admin-danger hover:bg-admin-danger hover:text-white transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/[0.04]">
          <HardDrive className="w-10 h-10 text-admin-muted mx-auto mb-2 shrink-0" />
          <p className="text-xs text-admin-text font-semibold">No media files found matching filters</p>
          <p className="text-[11px] text-admin-muted mt-1">Upload images or PDF attachments at the top dropzone.</p>
        </div>
      )}

      {/* Asset Preview Detailed Modal */}
      <CMSModal
        isOpen={selectedFile !== null}
        onClose={() => setSelectedFile(null)}
        title="Asset Meta Details"
        size="lg"
        actions={
          <>
            <button
              onClick={() => setSelectedFile(null)}
              className="admin-btn-secondary py-1.5 text-xs font-semibold"
            >
              Close
            </button>
            <button
              onClick={() => {
                deleteMediaFile(selectedFile.id);
                setSelectedFile(null);
              }}
              className="admin-btn-danger py-1.5 text-xs font-semibold"
            >
              Delete File
            </button>
            {selectedFile?.type === 'image' && (
              <button
                onClick={() => {
                  setCropTarget(selectedFile);
                  setSelectedFile(null);
                }}
                className="admin-btn-primary py-1.5 text-xs font-semibold flex items-center gap-1"
              >
                <Crop className="w-3.5 h-3.5" />
                Edit / Crop
              </button>
            )}
          </>
        }
      >
        {selectedFile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Preview image */}
            <div className="aspect-square bg-black/35 rounded-2xl overflow-hidden flex items-center justify-center border border-admin-border p-2">
              {selectedFile.type === 'image' ? (
                <img src={selectedFile.url} alt={selectedFile.name} className="max-w-full max-h-full object-contain" />
              ) : (
                <FileText className="w-20 h-20 text-admin-muted" />
              )}
            </div>
            
            {/* Metadata and actions */}
            <div className="space-y-4 text-xs">
              <div className="bg-admin-surface border border-admin-border p-4 rounded-xl space-y-2.5 font-sans">
                <div>
                  <span className="text-[10px] uppercase font-bold text-admin-muted tracking-wider block">File Name</span>
                  <span className="text-xs text-admin-text block select-all break-all mt-0.5">{selectedFile.name}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-admin-muted tracking-wider block">File Size</span>
                  <span className="text-xs text-admin-text block font-mono mt-0.5">{formatBytes(selectedFile.size)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-admin-muted tracking-wider block">Upload Date</span>
                  <span className="text-xs text-admin-text block mt-0.5">{selectedFile.date}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-admin-muted tracking-wider block">Data MIME Category</span>
                  <span className="text-xs text-admin-text block capitalize mt-0.5">{selectedFile.type}</span>
                </div>
              </div>

              {/* Copy URL trigger */}
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-admin-muted tracking-wider block">Asset URL (Base64 link string)</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={selectedFile.url}
                    className="glass-input rounded-xl px-3 py-2 text-[10px] font-mono text-admin-text flex-1 select-all"
                  />
                  <button
                    onClick={() => handleCopyLink(selectedFile.url, selectedFile.id)}
                    className={`py-2 px-3 text-xs shrink-0 flex items-center gap-1 font-semibold admin-btn transition-all duration-200 ${
                      copiedId === selectedFile.id
                        ? 'bg-admin-success text-white border-transparent shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                        : 'admin-btn-primary'
                    }`}
                  >
                    {copiedId === selectedFile.id ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
                <span className="text-[9px] text-admin-muted leading-relaxed block mt-1">
                  Copy this link string and paste inside text editors as image URL sources or button href routes.
                </span>
              </div>
            </div>
          </div>
        )}
      </CMSModal>

      {/* Image Cropper */}
      <ImageCropperModal
        isOpen={cropTarget !== null}
        onClose={() => setCropTarget(null)}
        file={cropTarget}
      />
    </div>
  );
}
