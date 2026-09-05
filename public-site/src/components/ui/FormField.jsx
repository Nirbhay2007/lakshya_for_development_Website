import React, { useState } from 'react';
import { motion } from 'framer-motion';

const FormField = ({ label, id, name, type = 'text', value, onChange, textarea = false, required = false, shouldReduceMotion, maxLength, pattern }) => {
  const [isFocused, setIsFocused] = useState(false);
  const shouldAnimate = isFocused || value !== '';

  return (
    <div className="relative w-full">
      {textarea ? (
        <textarea
          name={name}
          id={id}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows="4"
          className="block py-3.5 px-4 w-full text-base text-charcoal bg-white/60 rounded-xl border border-charcoal/15 focus:border-forest-500 focus:outline-none focus:ring-0 focus:bg-white peer font-sans resize-none transition-all"
          required={required}
          maxLength={maxLength}
        />
      ) : (
        <input
          type={type}
          name={name}
          id={id}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="block py-3.5 px-4 w-full text-base text-charcoal bg-white/60 rounded-xl border border-charcoal/15 focus:border-forest-500 focus:outline-none focus:ring-0 focus:bg-white peer font-sans transition-all"
          required={required}
          maxLength={maxLength}
          pattern={pattern}
        />
      )}
      <motion.label
        htmlFor={id}
        initial={{ y: 12, scale: 1, color: 'rgba(26, 26, 26, 0.5)' }}
        animate={{
          y: shouldAnimate ? -24 : 12,
          scale: shouldAnimate ? 0.8 : 1,
          color: isFocused ? '#1b5e20' : 'rgba(26, 26, 26, 0.5)',
        }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }}
        className="absolute left-4 top-0 z-10 origin-top-left font-sans font-semibold pointer-events-none text-sm select-none"
      >
        {label}
      </motion.label>
    </div>
  );
};

export default FormField;
