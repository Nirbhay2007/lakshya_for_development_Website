import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

const PageBanner = ({ title, subtitle, bgImage = '' }) => {
  const shouldReduceMotion = useReducedMotion();

  // If there's a custom bg image, we can use it, otherwise fallback to an elegant gradient.
  const inlineBg = bgImage ? { backgroundImage: `linear-gradient(rgba(26, 26, 26, 0.75), rgba(26, 26, 26, 0.85)), url(${bgImage})` } : {};

  return (
    <div
      style={inlineBg}
      className={`relative w-full overflow-hidden py-28 md:py-36 flex flex-col justify-center items-center text-center border-b border-white/10 ${
        bgImage ? 'bg-cover bg-center bg-forest-900' : 'bg-gradient-to-br from-forest-800 via-forest-700 to-earth-700'
      }`}
    >
      {/* Decorative leaf pattern SVG overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="leaf-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
              <path
                d="M40 0 C55 20, 55 40, 40 80 C25 40, 25 20, 40 0 Z"
                fill="none"
                stroke="white"
                strokeWidth="2"
              />
              <path
                d="M40 20 L30 30 M40 35 L50 45 M40 50 L30 60"
                stroke="white"
                strokeWidth="1.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaf-pattern)" />
        </svg>
      </div>

      {/* Page Info enclosed in a Glass Capsule */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 w-full">
        <motion.div
          className="glass-dark p-8 md:p-12 rounded-3xl shadow-xl max-w-3xl mx-auto"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.h1
            className="font-display font-bold text-4xl md:text-6xl text-cream tracking-wide leading-tight drop-shadow-sm"
            initial={shouldReduceMotion ? {} : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {title}
          </motion.h1>

          {subtitle && (
            <motion.p
              className="mt-4 text-base md:text-lg text-cream/90 max-w-xl mx-auto font-sans font-light leading-relaxed"
              initial={shouldReduceMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {subtitle}
            </motion.p>
          )}

          {/* Breadcrumbs */}
          <motion.div
            className="mt-6 flex items-center justify-center space-x-2 text-xs md:text-sm text-cream/70 border-t border-white/10 pt-4"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link to="/" className="hover:text-amber-400 transition-colors font-medium">
              Home
            </Link>
            <span>/</span>
            <span className="text-amber-400 font-semibold">{title}</span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default PageBanner;
