import React from 'react';

export default function CMSColorPicker({ label, value, onChange, description, name, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-admin-muted uppercase tracking-wider">{label}</label>}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-admin-border bg-admin-surface-2 flex items-center justify-center shrink-0">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange && onChange(e.target.value)}
            className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-none p-0 bg-transparent"
            name={name}
            {...props}
          />
        </div>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          className="glass-input rounded-xl px-3 py-2 text-sm text-admin-text font-mono w-32 uppercase"
          placeholder="#FFFFFF"
          maxLength={7}
        />
      </div>
      {description && <p className="text-xs text-admin-muted mt-0.5">{description}</p>}
    </div>
  );
}
