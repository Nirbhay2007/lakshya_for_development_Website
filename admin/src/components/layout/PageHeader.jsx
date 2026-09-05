import React from 'react';

export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-admin-border mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-admin-text">{title}</h1>
        {description && <p className="text-sm text-admin-muted mt-1">{description}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-3 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
