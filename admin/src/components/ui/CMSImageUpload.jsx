import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Link } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import toast from 'react-hot-toast';

// Helper to convert base64 to Blob
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type:mime});
}

// Helper to center-crop an image using Canvas
function cropImageToAspectRatio(imageSrc, aspectRatio) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      let targetRatio;
      if (aspectRatio === '1:1') targetRatio = 1;
      else if (aspectRatio === '16:9') targetRatio = 16 / 9;
      else if (aspectRatio === '4:3') targetRatio = 4 / 3;
      else {
        resolve(imageSrc); // Free aspect ratio, no crop
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const originalRatio = img.width / img.height;
      let sX, sY, sWidth, sHeight;

      if (originalRatio > targetRatio) {
        // Image is wider than target ratio - crop horizontally
        sHeight = img.height;
        sWidth = img.height * targetRatio;
        sX = (img.width - sWidth) / 2;
        sY = 0;
      } else {
        // Image is taller than target ratio - crop vertically
        sWidth = img.width;
        sHeight = img.width / targetRatio;
        sX = 0;
        sY = (img.height - sHeight) / 2;
      }

      // Set canvas size to match the cropped area or a standard resolution
      canvas.width = Math.min(sWidth, 1920);
      canvas.height = canvas.width / targetRatio;

      ctx.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = (e) => reject(e);
  });
}

export default function CMSImageUpload({
  label,
  value = '',
  onChange,
  aspectRatio = 'free', // '1:1' | '16:9' | '4:3' | 'free'
  description = '',
  className = '',
  error,
  compact = false
}) {
  const [isCompresing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleEditClick = (e) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const handleLinkClick = (e) => {
    e.stopPropagation();
    if (onChange) onChange(''); // Clear image to show input state
    setShowUrlInput(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Process selected file
  const processFile = async (file) => {
    setIsCompressing(true);
    setCompressProgress(10);
    setStatusMessage('Preparing image...');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Src = e.target.result;
        
        try {
          setCompressProgress(30);
          setStatusMessage('Processing aspect ratio...');
          const finalBase64 = await cropImageToAspectRatio(base64Src, aspectRatio);
          
          setCompressProgress(50);
          setStatusMessage('Uploading to server...');
          
          const formData = new FormData();
          const fileBlob = dataURLtoBlob(finalBase64);
          formData.append('file', fileBlob, file.name);

          const authPinHash = useAdminStore.getState().pinHash;

          const response = await fetch('/api/media/upload', {
            method: 'POST',
            headers: {
              'x-cms-pin-hash': authPinHash
            },
            body: formData
          });

          const data = await response.json();
          
          if (data.success) {
            setCompressProgress(100);
            
            // Add to Media Library
            const newMedia = {
              id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: file.name,
              size: fileBlob.size,
              date: new Date().toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
              }),
              type: 'image',
              url: data.url
            };
            useAdminStore.getState().addMediaFile(newMedia);

            if (onChange) onChange(data.url);
            setStatusMessage('Upload complete!');
            toast.success('Image uploaded successfully');
          } else {
            throw new Error(data.message || 'Upload failed');
          }

          setTimeout(() => {
            setIsCompressing(false);
            setCompressProgress(0);
            setStatusMessage('');
          }, 1500);
        } catch (uploadErr) {
          console.error('Upload error', uploadErr);
          setStatusMessage('Upload failed.');
          toast.error(uploadErr.message || 'Failed to upload image');
          setIsCompressing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File read failed', err);
      setStatusMessage('File read failed.');
      toast.error('Failed to read image file');
      setIsCompressing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, [aspectRatio, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    multiple: false
  });

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (urlValue.trim()) {
      if (onChange) onChange(urlValue.trim());
      setUrlValue('');
      setShowUrlInput(false);
    }
  };

  const removeImage = () => {
    if (onChange) onChange('');
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-admin-muted uppercase tracking-wider">
          {label}
        </label>
      )}

      {value ? (
        // Preview State
        <div className={`relative group rounded-xl overflow-hidden border border-admin-border bg-admin-surface-2/20 ${aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video'} flex items-center justify-center`}>
          <img
            src={value}
            alt="Preview"
            className="w-full h-full object-contain"
            onError={(e) => {
              // Handle broken links
              e.target.style.display = 'none';
            }}
          />
          
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2.5 transition-opacity duration-200">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={handleEditClick}
              className="p-2 rounded-xl bg-admin-accent text-white hover:bg-green-600 transition-colors shadow-lg"
              title="Upload New File"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleLinkClick}
              className="p-2 rounded-xl bg-admin-surface-3 text-white hover:bg-admin-surface-4 transition-colors shadow-lg"
              title="Paste Existing URL"
            >
              <Link className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={removeImage}
              className="p-2 rounded-xl bg-admin-danger text-white hover:bg-red-600 transition-colors shadow-lg"
              title="Remove Image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        // Upload / Dropzone State
        <div className="flex flex-col gap-2">
          {showUrlInput ? (
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                type="text"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="Paste image URL (e.g. /media/image.webp)"
                className="glass-input rounded-xl px-4 py-2 text-sm text-admin-text flex-1"
                required
              />
              <button
                type="submit"
                className="admin-btn-primary py-2 px-4 text-xs font-semibold"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setShowUrlInput(false)}
                className="admin-btn-secondary py-2 px-3 text-xs"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl ${compact ? 'p-2 aspect-square' : 'p-6'} flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? 'border-admin-accent bg-admin-accent/5 scale-[0.99]'
                  : error
                  ? 'border-admin-danger bg-admin-danger/5 hover:border-red-400'
                  : 'border-admin-border bg-admin-surface-2/20 hover:border-admin-border-hi hover:bg-admin-surface-2/40'
              }`}
            >
              <input {...getInputProps()} />
              
              {isCompresing ? (
                <div className="flex flex-col items-center justify-center w-full max-w-xs">
                  <div className="w-12 h-12 rounded-full border-4 border-admin-border border-t-admin-accent animate-spin mb-3" />
                  <span className="text-sm font-medium text-admin-text mb-1">{statusMessage}</span>
                  <div className="w-full bg-admin-surface rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-admin-accent h-1.5 transition-all duration-300"
                      style={{ width: `${compressProgress}%` }}
                    />
                  </div>
                </div>
              ) : compact ? (
                <div className="flex flex-col items-center justify-center">
                  <Upload className="w-6 h-6 text-admin-muted group-hover:text-admin-text mb-1 shrink-0" />
                  <span className="text-[10px] text-admin-text font-semibold">Upload</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-admin-muted group-hover:text-admin-text mb-3 shrink-0" />
                  <p className="text-sm text-admin-text font-medium">
                    Drag and drop your image here, or <span className="text-admin-accent-hi">browse</span>
                  </p>
                  <p className="text-xs text-admin-muted mt-1">
                    Accepts PNG, JPG, WEBP, GIF (Will automatically compress)
                  </p>
                </>
              )}
            </div>
          )}

          {!isCompresing && !showUrlInput && !compact && (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="flex items-center justify-center gap-1.5 py-2 text-xs text-admin-muted hover:text-admin-text transition-colors self-center bg-white/5 border border-admin-border rounded-xl px-4 hover:bg-white/10"
            >
              <Link className="w-3.5 h-3.5" />
              Or paste direct Image URL (e.g. Unsplash)
            </button>
          )}
        </div>
      )}

      {description && !error && (
        <p className="text-[11px] text-admin-muted/80">{description}</p>
      )}

      {error && (
        <span className="text-xs text-admin-danger font-medium mt-0.5">{error}</span>
      )}
    </div>
  );
}
