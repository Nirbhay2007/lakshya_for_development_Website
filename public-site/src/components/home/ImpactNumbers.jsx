import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import AnimatedCounter from '../ui/AnimatedCounter';
import { useCMSData } from '../../hooks/useCMSData';
import * as Icons from 'lucide-react';

const DynamicIcon = ({ name, ...props }) => {
  const IconComponent = Icons[name];
  if (!IconComponent) {
    return <Icons.Heart {...props} />;
  }
  return <IconComponent {...props} />;
};

const ImpactNumbers = () => {
  const shouldReduceMotion = useReducedMotion();
  const impactData = useCMSData('impact') || { settings: {}, stats: [] };
  const rawStats = impactData.stats || [];
  const stats = Array.isArray(rawStats) ? rawStats.filter((s) => s.active !== false) : [];
  const settings = impactData.settings || {};

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 150,
        damping: 20,
      },
    },
  };

  return (
    <section 
      className="py-20 md:py-28 relative overflow-hidden"
      style={{ backgroundColor: settings.bgColor || '#1a1b1a' }}
    >
      
      {/* Full-width liquid gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-forest-900/40 via-transparent to-earth-900/40 pointer-events-none z-0" />


      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Animated Flowing Line Connector between cards on desktop */}
        {!shouldReduceMotion && (
          <div className="absolute top-1/2 left-0 right-0 h-4 -translate-y-1/2 hidden lg:block pointer-events-none z-0 px-24">
            <svg viewBox="0 0 1000 20" className="w-full h-full text-forest-500/30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <motion.path
                d="M 10,10 C 250,-10 500,30 990,10"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="6 6"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
              />
            </svg>
          </div>
        )}

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 relative z-10"
          variants={shouldReduceMotion ? {} : containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              variants={shouldReduceMotion ? {} : cardVariants}
              className="glass-dark rounded-2xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors"
            >
              {/* Shimmer sweep on hover */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 pointer-events-none"
                  initial={{ x: '-100%', skewX: -15 }}
                  whileHover={{ x: '200%' }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
              )}
              {/* Dynamic Icon */}
              {stat.icon && stat.icon.trim() !== '' && (
                <div 
                  className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-all duration-300"
                  style={{ color: settings.accentColor || '#f5a623' }}
                >
                  <DynamicIcon name={stat.icon} className="w-6 h-6" />
                </div>
              )}

              {/* Stat Number with soft amber glow */}
              <div
                style={{ 
                  textShadow: `0 0 30px ${settings.accentColor || '#f5a623'}66`,
                  color: settings.accentColor || '#fbbf24'
                }}
                className="font-display font-bold text-5xl md:text-6xl mb-3 drop-shadow-sm tracking-tight"
              >
                {settings.enableCountUp !== false ? (
                  <AnimatedCounter value={stat.value} duration={2} />
                ) : (
                  stat.value
                )}
              </div>

              {/* Stat Label */}
              <span className="font-sans text-xs md:text-sm uppercase tracking-widest text-cream/70 font-semibold max-w-[180px]">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default ImpactNumbers;
