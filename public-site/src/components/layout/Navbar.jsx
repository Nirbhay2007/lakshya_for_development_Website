import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Button from '../ui/Button';
import logoImgDefault from '../../assets/lakshya.png';
import { useCMSData } from '../../hooks/useCMSData';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const settingsData = useCMSData('settings');
  const general = settingsData?.general || {};
  
  const navItems = useMemo(() => {
    const rawNavItems = settingsData?.navigation || [];
    return Array.isArray(rawNavItems) ? rawNavItems.filter((item) => item.active !== false) : [];
  }, [settingsData?.navigation]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 20;
      setIsScrolled((prev) => {
        if (prev !== scrolled) return scrolled;
        return prev;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const navContainerVariants = {
    hidden: { opacity: 0, y: -20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const navItemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  };

  const isHome = location.pathname === '/';
  
  const logo = (!isScrolled && isHome) ? (general.logoLight || logoImgDefault) : (general.logoDark || logoImgDefault);
  const siteName = general.siteName || "Lakshya";

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-50">
        <motion.nav
          className={`w-full py-4 transition-[background-color,border-color,box-shadow] duration-300 ${
            isScrolled
              ? 'bg-white border-b border-white/30 shadow-md px-6 md:px-12'
              : isHome
              ? 'bg-transparent border-b border-transparent px-6 md:px-12'
              : 'bg-cream border-b border-white/10 px-6 md:px-12'
          }`}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo with Green Glow on Hover */}
            <Link to="/" className="flex items-center space-x-3 group relative">
              <img
                src={logo}
                onError={(e) => { if (e.target.src !== logoImgDefault) e.target.src = logoImgDefault; }}
                alt="Logo"
                className="w-9 h-9 object-contain transform group-hover:scale-105 transition-transform duration-300"
              />
              <div className="flex flex-col">
                <span className={`font-display font-bold text-xl md:text-2xl leading-none tracking-wide transition-all duration-300 ${
                  !isScrolled && isHome ? 'text-white' : 'text-forest-700'
                }`}>
                  {siteName}
                </span>
                {general.tagline && (
                  <span className={`font-sans text-[9px] md:text-[11px] mt-1 leading-none tracking-wide transition-all duration-300 ${
                    !isScrolled && isHome ? 'text-white/75' : 'text-charcoal/60'
                  }`}>
                    {general.tagline}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Nav Links with Glass Pill Overlays */}
            <div className="hidden lg:flex items-center space-x-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    target={item.newTab ? '_blank' : undefined}
                    rel={item.newTab ? 'noopener noreferrer' : undefined}
                    onMouseEnter={() => setHoveredTab(item.name)}
                    onMouseLeave={() => setHoveredTab(null)}
                    className={`relative px-4 py-2 rounded-full font-sans font-medium text-sm transition-colors duration-300 ${
                      isActive
                        ? !isScrolled && isHome ? 'text-amber-400' : 'text-forest-600 font-semibold'
                        : !isScrolled && isHome
                        ? 'text-white/80 hover:text-amber-400'
                        : 'text-charcoal/80 hover:text-forest-600'
                    }`}
                  >
                    <span className="relative z-10">{item.name}</span>
                    
                    {/* Hover glass pill indicator */}
                    {hoveredTab === item.name && !shouldReduceMotion && (
                      <motion.span
                        layoutId="navPill"
                        className="absolute inset-0 bg-white/10 rounded-full border border-white/20 z-0"
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      />
                    )}

                    {/* Active dot indicator underneath */}
                    {isActive && (
                      <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                        !isScrolled && isHome ? 'bg-amber-400' : 'bg-forest-500'
                      }`} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* CTA Button */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link to="/donate">
                <motion.button
                  whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                  className={`font-sans font-bold text-sm rounded-full px-6 py-2.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(46,125,50,0.2)] ${
                    !isScrolled && isHome
                      ? 'bg-forest-500 hover:bg-forest-600 text-white'
                      : 'bg-forest-600 hover:bg-forest-700 text-white'
                  }`}
                >
                  Donate Now
                </motion.button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-xl transition-colors ${
                  !isScrolled && isHome ? 'text-white hover:bg-white/10' : 'text-charcoal hover:bg-charcoal/5'
                }`}
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </motion.nav>
      </header>

      {/* Mobile Menu Overlay with glassmorphism */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-charcoal/80 z-40 lg:hidden flex flex-col pt-32 px-8 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="glass-dark max-w-sm w-full mx-auto p-8 rounded-3xl space-y-6 text-center my-auto"
              variants={shouldReduceMotion ? {} : navContainerVariants}
              initial="hidden"
              animate="show"
            >
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <motion.div key={item.name} variants={shouldReduceMotion ? {} : navItemVariants}>
                    <Link
                      to={item.path}
                      target={item.newTab ? '_blank' : undefined}
                      rel={item.newTab ? 'noopener noreferrer' : undefined}
                      className={`text-xl font-display font-semibold block transition-colors py-2.5 rounded-xl ${
                        isActive
                          ? 'bg-white/10 text-amber-400'
                          : 'text-white/80 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                );
              })}
              
              <motion.div variants={shouldReduceMotion ? {} : navItemVariants} className="pt-4">
                <Link to="/donate">
                  <Button variant="filled" color="forest" className="w-full text-base py-3 shadow-lg">
                    Donate Now
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
