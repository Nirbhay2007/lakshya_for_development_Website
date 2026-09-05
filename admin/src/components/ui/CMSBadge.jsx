import React from 'react';

const variantClasses = {
  success: 'bg-green-500/10 text-green-400 border border-green-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
  info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  neutral: 'bg-white/5 text-admin-muted border border-white/10',
  primary: 'bg-forest-500/15 text-forest-400 border border-forest-500/20'
};

export default function CMSBadge({ children, variant = 'neutral', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
