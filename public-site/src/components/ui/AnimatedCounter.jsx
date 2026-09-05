import React from 'react';  
import { useCountUp } from '../../hooks/useCountUp';
import { useReducedMotion } from 'framer-motion';

const AnimatedCounter = ({ value, duration = 1.5 }) => {
  const shouldReduceMotion = useReducedMotion();
  const [ref, count] = useCountUp(value, duration);

  if (shouldReduceMotion) {
    return <span>{value}</span>;
  }

  // Format count back to original pattern, e.g. adding "+" or commas
  const stringValue = String(value !== undefined && value !== null ? value : '');
  const suffix = stringValue.replace(/[0-9,]/g, ''); // get "+" or other symbols
  const formattedCount = (count !== undefined && count !== null) ? count.toLocaleString() : '0';

  return (
    <span ref={ref} className="tabular-nums">
      {formattedCount}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;