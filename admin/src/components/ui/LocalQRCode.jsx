import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, QrCode } from 'lucide-react';

export default function LocalQRCode({ value, title, filename }) {
  const [dataUrl, setDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!value) return;

    // Generate high resolution 100% standard-compliant QR code (0 center overlay, 100% instant scannability)
    QRCode.toDataURL(value, {
      width: 1000,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#044e37', // Deep Emerald Green
        light: '#ffffff'  // Pure White
      }
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('Local QR generation error:', err));
  }, [value]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || `QR_Lakshya_${(title || 'cause').replace(/[^a-zA-Z0-9]+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-admin-surface-2 p-3.5 rounded-xl border border-admin-border space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl bg-white p-1 border border-admin-border shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
            {dataUrl ? (
              <img
                src={dataUrl}
                alt={`Poster QR Code for ${title}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-4 h-4 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <div className="space-y-0.5 text-left">
            <div className="text-xs font-bold text-admin-accent-hi uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-admin-accent" />
              <span>Poster QR Code & Direct Link</span>
            </div>
            <div className="text-[11px] text-admin-muted font-mono select-all break-all">
              {value}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-lg bg-admin-surface border border-admin-border hover:border-admin-accent text-admin-text text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!dataUrl}
            className="px-3 py-1.5 rounded-lg bg-admin-accent hover:bg-admin-accent-hi disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download QR (PNG)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
