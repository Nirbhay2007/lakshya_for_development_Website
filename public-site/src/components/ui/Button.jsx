import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'filled', // filled, outline, white-outline, text
  color = 'forest', // forest, earth, amber
  className = '',
  pulse = false,
  href,
  target,
  rel,
  size,
  ...props
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Theme color maps
  const bgColors = {
    forest: 'bg-forest-500 text-white hover:bg-forest-600 focus:ring-forest-500',
    earth: 'bg-earth-500 text-white hover:bg-earth-600 focus:ring-earth-500',
    amber: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500',
  };

  const borderColors = {
    forest: 'border-2 border-forest-500 text-forest-600 hover:bg-forest-50 focus:ring-forest-500',
    earth: 'border-2 border-earth-500 text-earth-600 hover:bg-earth-50 focus:ring-earth-500',
    amber: 'border-2 border-amber-500 text-amber-600 hover:bg-amber-50 focus:ring-amber-500',
  };

  const textColors = {
    forest: 'text-forest-600 hover:text-forest-700 focus:ring-forest-500',
    earth: 'text-earth-600 hover:text-earth-700 focus:ring-earth-500',
    amber: 'text-amber-600 hover:text-amber-700 focus:ring-amber-500',
  };

  let baseStyles = 'inline-flex items-center justify-center font-sans font-semibold rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 px-6 py-3 text-base';

  let variantStyles = '';
  if (variant === 'filled') {
    variantStyles = bgColors[color];
  } else if (variant === 'outline') {
    variantStyles = borderColors[color];
  } else if (variant === 'white-outline') {
    variantStyles = 'border-2 border-white text-white hover:bg-white/10 focus:ring-white';
  } else if (variant === 'text') {
    variantStyles = `px-2 py-1 ${textColors[color]}`;
  }

  // Animation variants
  const hoverScale = shouldReduceMotion ? 1 : 1.04;
  const tapScale = shouldReduceMotion ? 1 : 0.98;

  const pulseAnimation = pulse && !shouldReduceMotion
    ? {
        scale: [1, 1.03, 1],
        boxShadow: [
          '0 0 0 0px rgba(46, 125, 50, 0.4)',
          '0 0 0 8px rgba(46, 125, 50, 0)',
          '0 0 0 0px rgba(46, 125, 50, 0.4)',
        ],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }
    : {};

  if (href) {
    const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:');

    if (isExternal) {
      return (
        <a href={href} target={target || '_blank'} rel={rel || 'noopener noreferrer'} className="inline-block" style={{ textDecoration: 'none' }}>
          <motion.div
            onClick={onClick}
            className={`${baseStyles} ${variantStyles} ${className} cursor-pointer`}
            whileHover={shouldReduceMotion ? {} : { scale: hoverScale, y: -2 }}
            whileTap={shouldReduceMotion ? {} : { scale: tapScale, y: 0 }}
            animate={pulseAnimation}
            {...props}
          >
            {children}
          </motion.div>
        </a>
      );
    }

    return (
      <Link to={href} className="inline-block" style={{ textDecoration: 'none' }}>
        <motion.div
          onClick={onClick}
          className={`${baseStyles} ${variantStyles} ${className} cursor-pointer`}
          whileHover={shouldReduceMotion ? {} : { scale: hoverScale, y: -2 }}
          whileTap={shouldReduceMotion ? {} : { scale: tapScale, y: 0 }}
          animate={pulseAnimation}
          {...props}
        >
          {children}
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles} ${className}`}
      whileHover={shouldReduceMotion ? {} : { scale: hoverScale, y: -2 }}
      whileTap={shouldReduceMotion ? {} : { scale: tapScale, y: 0 }}
      animate={pulseAnimation}
      {...props}
    >
      {children}
    </motion.button>
  );
};

export default Button;
