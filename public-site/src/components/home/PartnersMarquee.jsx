import React, { useMemo } from 'react';
import { useCMSData } from '../../hooks/useCMSData';
import SafeImage from '../ui/SafeImage';

const PartnersMarquee = () => {
  const partnersData = useCMSData('partners') || { settings: {}, rows: [] };
  const settings = partnersData.settings || {};
  const rows = useMemo(() => Array.isArray(partnersData.rows) ? partnersData.rows : [], [partnersData]);

  const speedDuration = settings.speed === 'slow' ? '45s' : settings.speed === 'fast' ? '15s' : '28s';

  const renderRow = (items, directionClass) => {
    if (items.length === 0) return null;
    // Repeat items to fill marquee width seamlessly
    const list = [...items, ...items, ...items, ...items];
    return (
      <div className="flex-1 overflow-hidden relative flex items-center marquee-container mask-fade">
        <div 
          className={`${directionClass} whitespace-nowrap flex items-center py-2`}
          style={{ animationDuration: speedDuration }}
        >
          {list.map((src, idx) => (
            <div
              key={idx}
              className="inline-flex items-center justify-center mx-4 px-8 py-3.5 bg-white/20 border border-white/10 rounded-full shadow-lg shrink-0 hover:bg-white/30 transition-all duration-300 hover:scale-105"
            >
              <SafeImage
                src={src}
                alt={`Partner logo ${idx}`}
                className="h-7 w-auto object-contain opacity-80 hover:opacity-100 transition-all duration-300"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const hasActivePartners = useMemo(() => {
    return rows.some(row => 
      Array.isArray(row.partners) && row.partners.some(p => p.active !== false && (p.logo || p.image))
    );
  }, [rows]);

  if (!hasActivePartners) return null;

  return (
    <section className="relative py-20 bg-forest-600 overflow-hidden border-t border-b border-white/10">
      
      {/* Dark glass cover wrapper */}
      <div className="absolute inset-0 bg-black/25 z-0 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Heading */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 text-white">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-2 font-sans">
            Collaborations
          </span>
          <h2 className="font-display font-bold text-3xl md:text-5xl text-cream leading-tight">
            Trusted By
          </h2>
          <div className="w-24 h-1 bg-amber-400/40 rounded-full mt-4" />
        </div>

        {/* Dynamic Rows list */}
        <div className="space-y-12 mt-8">
          {rows.map((row, rIdx) => {
            const activeItems = Array.isArray(row.partners)
              ? row.partners
                  .filter(p => p.active !== false && (p.logo || p.image))
                  .map(p => p.logo || p.image)
              : [];
            
            if (activeItems.length === 0) return null;

            return (
              <div key={row.id || `row_${rIdx}`} className="space-y-3.5">
                {row.heading && row.heading.trim() !== '' && (
                  <h3 className="text-center text-xs font-semibold uppercase tracking-widest text-cream/70 font-sans">
                    {row.heading}
                  </h3>
                )}
                {renderRow(activeItems, rIdx % 2 === 0 ? 'animate-scroll-left' : 'animate-scroll-right')}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default PartnersMarquee;
