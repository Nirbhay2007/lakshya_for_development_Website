import React from 'react';

export default function CMSInput({
  label,
  error,
  maxLength,
  value = '',
  onChange,
  className = '',
  description,
  type = 'text',
  placeholder,
  ...props
}) {
  const charCount = typeof value === 'string' ? value.length : 0;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {(label || maxLength) && (
        <div className="flex items-center justify-between">
          {label && (
            <label className="text-xs font-semibold text-admin-muted uppercase tracking-wider">
              {label}
            </label>
          )}
          {maxLength && (
            <span className={`text-[10px] ${charCount >= maxLength ? 'text-admin-danger' : 'text-admin-muted'}`}>
              {charCount}/{maxLength}
            </span>
          )}
        </div>
      )}

      <input
        type={type}
        value={value}
        onChange={(e) => {
          if (maxLength && e.target.value.length > maxLength) return;
          if (onChange) onChange(e.target.value);
        }}
        placeholder={placeholder}
        className={`glass-input rounded-xl px-4 py-2.5 text-sm text-admin-text ${
          error ? 'border-admin-danger focus:border-admin-danger' : ''
        }`}
        {...props}
      />

      {description && !error && (
        <p className="text-[11px] text-admin-muted/80">{description}</p>
      )}

      {error && (
        <span className="text-xs text-admin-danger font-medium mt-0.5">{error}</span>
      )}
    </div>
  );
}
