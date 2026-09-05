import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import CMSModal from './CMSModal';
import { Crop, RefreshCw } from 'lucide-react';
import { useAdminStore } from '../../store/useAdminStore';
import toast from 'react-hot-toast';

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export default function ImageCropperModal({ isOpen, onClose, file }) {
  const [crop, setCrop] = useState();
  const [aspect, setAspect] = useState(undefined);
  const imgRef = useRef(null);
  const addMediaFile = useAdminStore((state) => state.addMediaFile);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCrop(undefined);
      setAspect(undefined);
    }
  }, [isOpen]);

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    if (aspect) {
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  const handleAspectChange = (newAspect) => {
    setAspect(newAspect);
    if (imgRef.current && newAspect) {
      setCrop(centerAspectCrop(imgRef.current.width, imgRef.current.height, newAspect));
    } else if (imgRef.current && !newAspect) {
      setCrop(undefined); // Reset to free crop
    }
  };

  const handleSave = async () => {
    if (!imgRef.current || !crop || !crop.width || !crop.height) {
      onClose();
      return;
    }
    setIsProcessing(true);

    try {
      let pixelCrop = crop;
      if (crop.unit === '%') {
        pixelCrop = {
          x: (crop.x * imgRef.current.width) / 100,
          y: (crop.y * imgRef.current.height) / 100,
          width: (crop.width * imgRef.current.width) / 100,
          height: (crop.height * imgRef.current.height) / 100,
          unit: 'px'
        };
      }

      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      canvas.width = pixelCrop.width * scaleX;
      canvas.height = pixelCrop.height * scaleY;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(
        imgRef.current,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY
      );

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      if (!blob) throw new Error('Failed to create image blob');

      const authPinHash = useAdminStore.getState().pinHash;
      const formData = new FormData();
      formData.append('file', blob, `cropped_${file.name}`);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'x-cms-pin-hash': authPinHash
        },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        const newMedia = {
          id: `media_cropped_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: `cropped_${file.name}`,
          size: blob.size, 
          date: new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
          }),
          type: 'image',
          url: data.url
        };

        addMediaFile(newMedia);
        toast.success('Image cropped successfully');
        onClose();
      } else {
        throw new Error(data.message || 'Upload failed');
      }
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Failed to crop image.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file || file.type !== 'image') return null;

  return (
    <CMSModal
      isOpen={isOpen}
      onClose={onClose}
      title="Crop Image"
      size="lg"
      actions={
        <>
          <button onClick={onClose} disabled={isProcessing} className="admin-btn-secondary py-1.5 text-xs font-semibold">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isProcessing} className="admin-btn-primary py-1.5 text-xs font-semibold flex items-center gap-1">
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crop className="w-4 h-4" />}
            Save Cropped Image
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => handleAspectChange(undefined)} className={`px-3 py-1 text-xs rounded border ${!aspect ? 'bg-admin-accent border-admin-accent text-white' : 'border-admin-border text-admin-muted'}`}>Free</button>
          <button onClick={() => handleAspectChange(16 / 9)} className={`px-3 py-1 text-xs rounded border ${aspect === 16/9 ? 'bg-admin-accent border-admin-accent text-white' : 'border-admin-border text-admin-muted'}`}>16:9 Banner</button>
          <button onClick={() => handleAspectChange(1)} className={`px-3 py-1 text-xs rounded border ${aspect === 1 ? 'bg-admin-accent border-admin-accent text-white' : 'border-admin-border text-admin-muted'}`}>1:1 Square</button>
          <button onClick={() => handleAspectChange(4 / 3)} className={`px-3 py-1 text-xs rounded border ${aspect === 4/3 ? 'bg-admin-accent border-admin-accent text-white' : 'border-admin-border text-admin-muted'}`}>4:3 Box</button>
        </div>

        <div className="flex justify-center bg-black/40 rounded-xl overflow-hidden max-h-[60vh]">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            aspect={aspect}
          >
            <img
              ref={imgRef}
              src={file.url}
              alt="Crop target"
              onLoad={onImageLoad}
              className="max-h-[60vh] object-contain"
              crossOrigin="anonymous" 
            />
          </ReactCrop>
        </div>
      </div>
    </CMSModal>
  );
}
