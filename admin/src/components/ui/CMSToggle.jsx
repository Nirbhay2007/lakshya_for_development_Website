import React from 'react';

export default function CMSToggle({ label, checked, onChange, description, name, ...props }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <div className="relative mt-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="sr-only"
          name={name}
          {...props}
        />
        <div className={`w-10 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-admin-accent' : 'bg-admin-surface-2 border border-admin-border'}`} />
        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ${checked ? 'transform translate-x-4 bg-white' : 'bg-admin-text/60'}`} />
      </div>
      <div>
        {label && <span className="text-sm font-medium text-admin-text">{label}</span>}
        {description && <p className="text-xs text-admin-muted mt-0.5">{description}</p>}
      </div>
    </label>
  );
}
