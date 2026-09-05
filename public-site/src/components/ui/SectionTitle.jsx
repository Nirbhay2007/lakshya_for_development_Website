import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const SectionTitle = ({
  eyebrow,
  title,
  subtitle,
  align = 'center', // center, left
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  const alignmentStyles = align === 'left' ? 'text-left items-start' : 'text-center items-center mx-auto';

  // SVG Brush stroke path animation
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { type: 'spring', duration: 1.2, bounce: 0 },
        opacity: { duration: 0.2 },
      },
    },
  };

  return (
    <div className={`flex flex-col max-w-3xl ${alignmentStyles} ${className} mb-12`}>
      {eyebrow && (
        <motion.span
          className="text-xs font-semibold uppercase tracking-widest text-forest-600 mb-2 font-sans"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 10 }}
          whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5 }}
        >
          {eyebrow}
        </motion.span>
      )}
      
      <div className="relative inline-block pb-4">
        <motion.h2
          className="font-display font-bold text-3xl md:text-5xl text-charcoal leading-tight"
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 15 }}
          whileInView={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {title}
        </motion.h2>

        {/* Signature hand-drawn brush stroke SVG underline */}
        <div className={`absolute bottom-0 left-0 w-full h-4 ${align === 'center' ? 'flex justify-center' : ''}`}>
          <svg
            className="w-48 md:w-64 h-full"
            viewBox="0 0 300 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <motion.path
              d="M 10 15 C 80 5, 180 5, 290 12 C 200 12, 100 10, 20 17"
              stroke="#2e7d32"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={pathVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            />
          </svg>
        </div>
      </div>

      {subtitle && (
        <motion.p
          className="text-lg text-earth-600 mt-4 font-sans max-w-xl font-normal leading-relaxed"
          initial={shouldReduceMotion ? {} : { opacity: 0 }}
          whileInView={shouldReduceMotion ? {} : { opacity: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
};

export default SectionTitle;
