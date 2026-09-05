import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Compass } from 'lucide-react';

const NotFound = () => {
  const shouldReduceMotion = useReducedMotion();

  const pageTransition = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: 'easeOut' },
      };

  return (
    <motion.div {...pageTransition} className="pt-20 min-h-screen bg-clay-gradient flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-8">
        {/* Animated 404 number */}
        <motion.div
          initial={shouldReduceMotion ? {} : { scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="text-[120px] md:text-[160px] font-display font-bold leading-none text-forest-600/20 select-none">
            404
          </h1>
        </motion.div>

        <div className="space-y-3 -mt-8">
          <div className="flex items-center justify-center gap-2 text-forest-600">
            <Compass className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest font-sans font-bold">Page Not Found</span>
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-charcoal">
            Oops! This path doesn't exist.
          </h2>
          <p className="text-charcoal/60 font-sans text-sm md:text-base leading-relaxed max-w-md mx-auto">
            The page you're looking for may have been moved, deleted, or perhaps never existed. Let's get you back on track.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-forest-600 hover:bg-forest-700 text-white font-sans font-semibold text-sm rounded-full transition-colors shadow-lg"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/60 hover:bg-white/80 text-charcoal font-sans font-semibold text-sm rounded-full transition-colors border border-charcoal/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default NotFound;
