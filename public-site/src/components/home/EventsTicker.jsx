import React from 'react';
import { useCMSData } from '../../hooks/useCMSData';

const EventsTicker = () => {
  const eventsData = useCMSData('events') || { settings: {}, items: [] };
  const rawEvents = eventsData.items || [];
  const todayStr = new Date().toISOString().split('T')[0];
  const events = rawEvents
    .filter(item => {
      if (!item.active) return false;
      if (item.date && item.date > todayStr) return false;
      return true;
    })
    .map(item => item.text);
  const settings = eventsData.settings || {};

  const speedDuration = settings.speed === 'slow' ? '30s' : settings.speed === 'fast' ? '10s' : '20s';
  const bgColor = settings.bgColor || '#2e7d32';
  const textColor = settings.textColor || '#ffffff';

  // Duplicate events to create seamless loop
  const tickerContent = [...events, ...events, ...events].map((event, idx) => (
    <span 
      key={idx} 
      className="inline-flex items-center mx-8 text-sm md:text-base font-medium font-sans"
      style={{ color: textColor }}
    >
      <span className="mr-6">{event}</span>
      <span className="text-amber-300 text-lg select-none">•</span>
    </span>
  ));

  if (events.length === 0) return null;

  return (
    <div 
      className="relative w-full overflow-hidden border-y border-white/10 z-20"
      style={{ backgroundColor: bgColor }}
    >
      {/* Shimmer overlay effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_8s_infinite_linear]" style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0) 100%)' }} />

      <div className="flex items-center h-12 w-full glass-dark rounded-none border-0">
        
        {/* Label Badge with Pulsing Dot */}
        <div className="bg-amber-400 px-4 md:px-6 h-full flex items-center shrink-0 shadow-md relative z-10 select-none">
          {/* Pulsing indicator */}
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-charcoal opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-charcoal"></span>
          </span>
          
          <span className="text-charcoal font-black text-xs tracking-wider uppercase font-sans whitespace-nowrap">
            Latest Updates
          </span>
        </div>

        {/* Marquee Track */}
        <div className="flex-1 overflow-hidden relative flex items-center marquee-container mask-fade">
          <div 
            className="animate-scroll-left whitespace-nowrap flex items-center"
            style={{ animationDuration: speedDuration }}
          >
            {tickerContent}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventsTicker;
