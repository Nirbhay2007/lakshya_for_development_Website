import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Wrench, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const Maintenance = ({ message, logoSrc, autoRedirectToHome = false }) => {
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!autoRedirectToHome) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRedirectToHome, navigate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.6,
        when: "beforeChildren",
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-clay-gradient px-6">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-lg w-full bg-white/60 backdrop-blur-xl border border-white/40 p-8 md:p-12 rounded-[2rem] shadow-2xl text-center space-y-6"
      >
        {logoSrc && (
          <motion.div variants={itemVariants} className="flex justify-center">
            <img src={logoSrc} alt="Logo" className="h-14 md:h-18 w-auto object-contain" />
          </motion.div>
        )}
        
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-center gap-2 text-forest-600">
            <Wrench className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest font-sans font-bold">Page Maintenance</span>
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-charcoal">
            We'll be back soon!
          </h1>
          <p className="text-charcoal/70 font-sans text-sm md:text-base leading-relaxed">
            {message || 'This page is currently undergoing scheduled maintenance. Please check back shortly.'}
          </p>
        </motion.div>
        
        {autoRedirectToHome && (
          <motion.div variants={itemVariants} className="space-y-4 pt-2">
            <div className="bg-forest-600/10 border border-forest-600/20 text-forest-800 rounded-xl p-3.5 text-xs md:text-sm font-medium">
              You will be redirected to the <strong className="text-forest-700 font-bold">Home Page</strong> in <span className="inline-block bg-forest-600 text-cream px-2 py-0.5 rounded font-mono font-bold">{countdown}s</span>...
            </div>
            
            <Link
              to="/"
              replace
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-cream font-semibold rounded-xl text-xs md:text-sm transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to Home Page Now</span>
            </Link>
          </motion.div>
        )}

        {!autoRedirectToHome && (
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-forest-600/10 text-forest-600">
              <motion.div
                animate={shouldReduceMotion ? {} : { rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
              >
                <Wrench className="w-5 h-5" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default Maintenance;
