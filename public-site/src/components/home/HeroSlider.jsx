import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCMSData } from '../../hooks/useCMSData';

const HeroSlider = () => {
  const [current, setCurrent] = useState(0);
  const rawSlides = useCMSData('hero');
  
  const slides = useMemo(() => {
    const list = rawSlides || [];
    return Array.isArray(list) ? list.filter((s) => s.status !== 'Hidden' && s.active !== false) : [];
  }, [rawSlides]);

  useEffect(() => {
    if (slides.length === 0) return;
    const currentSlide = slides[current];
    const duration = (currentSlide?.duration || 6) * 1000;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, duration);
    return () => clearInterval(timer);
  }, [slides, current]);

  const [imageErrors, setImageErrors] = useState({});

  useEffect(() => {
    const slideImg = slides[current]?.image;
    if (!slideImg || imageErrors[current]) return;
    const img = new Image();
    img.src = slideImg;
    img.onerror = () => setImageErrors(prev => ({ ...prev, [current]: true }));
  }, [current, slides, imageErrors]);

  const nextSlide = () => {
    if (slides.length === 0) return;
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    if (slides.length === 0) return;
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  if (slides.length === 0) {
    return (
      <div className="w-full h-[90vh] bg-charcoal flex items-center justify-center text-white">
        <p>Loading Hero Slide...</p>
      </div>
    );
  }

  const fadeVariants = {
    enter: { opacity: 0, y: 10 },
    center: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.4 } }
  };

  const currentSlide = slides[current] || slides[0];
  const FALLBACK_HERO_IMAGE = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1400&auto=format&fit=crop';

  // Optimize Unsplash image URLs for screen size — mobile gets smaller images
  const optimizeImageUrl = (url) => {
    if (!url || !url.includes('unsplash.com')) return url;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    return isMobile ? url.replace(/w=\d+/, 'w=800') : url;
  };

  return (
    <div className="relative w-full h-[90vh] min-h-[600px] md:h-[95vh] overflow-hidden bg-charcoal">
      {/* Background Images Overlayed */}
      {slides.map((slide, index) => {
        const isActive = index === current;
        const rawImage = imageErrors[index] || !slide?.image ? FALLBACK_HERO_IMAGE : slide.image;
        const heroImage = optimizeImageUrl(rawImage);
        return (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10 delay-0' : 'opacity-0 z-0 delay-500'}`}
            style={{
              backgroundImage: `linear-gradient(to top, rgba(26,26,26,0.95) 15%, rgba(26,26,26,0.4) 60%, rgba(26,26,26,0.7) 100%), url('${heroImage}')`,
            }}
          />
        );
      })}

      {/* Content */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current}
          className="absolute inset-0 flex items-center z-20 pointer-events-none"
          variants={fadeVariants}
          initial="enter"
          animate="center"
          exit="exit"
        >
          <div className="max-w-7xl mx-auto px-6 w-full text-left text-white mt-12 md:mt-0 pointer-events-auto">
            
            {/* Clean Glass Card */}
            <div className="max-w-3xl glass-dark rounded-3xl p-6 md:p-12 space-y-4 md:space-y-6 shadow-2xl relative border border-white/10 mx-auto md:mx-0">
              
              {/* Eyebrow */}
              <motion.span
                className="inline-block text-[10px] md:text-xs font-bold tracking-widest text-amber-400 uppercase font-sans border-l-2 border-amber-400 pl-3"
              >
                {currentSlide.eyebrow}
              </motion.span>

              {/* Headline */}
              <motion.h1
                className="font-display font-bold text-3xl md:text-6xl lg:text-7xl leading-tight tracking-wide text-cream drop-shadow-sm"
              >
                {currentSlide.title}
              </motion.h1>

              {/* Subtext */}
              <motion.p
                className="text-sm md:text-lg text-cream/80 max-w-xl font-sans font-light leading-relaxed"
              >
                {currentSlide.subtext}
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="flex flex-wrap gap-3 md:gap-4 pt-2"
              >
                {currentSlide.cta1Label && (
                  <Link to={currentSlide.cta1Link || '/programmes'}>
                    <button className="relative overflow-hidden inline-flex items-center justify-center font-sans font-semibold rounded-full px-5 py-2.5 md:px-7 md:py-3 text-sm md:text-base text-white bg-gradient-to-r from-forest-500 to-forest-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(46,125,50,0.3)] hover:brightness-105 transition-all duration-300">
                      {/* Shimmer sweep */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0"
                        initial={{ x: '-100%', skewX: -15 }}
                        animate={{ x: '200%' }}
                        transition={{ repeat: Infinity, repeatDelay: 3, duration: 1.2 }}
                      />
                      {currentSlide.cta1Label}
                    </button>
                  </Link>
                )}
                
                {currentSlide.cta2Label && (
                  <Link to={currentSlide.cta2Link || '/donate'}>
                    <button className="inline-flex items-center justify-center font-sans font-semibold rounded-full px-5 py-2.5 md:px-7 md:py-3 text-sm md:text-base text-white bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-300">
                      {currentSlide.cta2Label}
                    </button>
                  </Link>
                )}
              </motion.div>

            </div>

          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav Controls */}
      <div className="absolute bottom-6 md:bottom-10 left-0 right-0 px-4 md:px-6 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 pointer-events-none z-30">
        
        {/* Glass Pill Abbreviated Tabs */}
        <div className="flex space-x-1.5 md:space-x-3 pointer-events-auto bg-black/40 border border-white/15 p-1 md:p-1.5 rounded-full overflow-x-auto max-w-full scrollbar-hide no-scrollbar">
          {slides.map((slide, index) => {
            const isActive = current === index;
            return (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-sm font-semibold font-sans tracking-wide transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-charcoal shadow-md scale-102 font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              >
                {slide.tabName}
              </button>
            );
          })}
        </div>

        {/* Arrow Buttons */}
        <div className="flex space-x-2 pointer-events-auto shrink-0 hidden md:flex">
          <button
            onClick={prevSlide}
            className="p-3 rounded-full border border-white/25 bg-white/15 hover:bg-white/25 text-white transition-all duration-300"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextSlide}
            className="p-3 rounded-full border border-white/25 bg-white/15 hover:bg-white/25 text-white transition-all duration-300"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Preload all slide images to prevent transition flashes/lag */}
      <div className="hidden" aria-hidden="true">
        {slides.map((s, idx) => (
          <img key={idx} src={s.image} alt={s.title || `Lakshya hero slide ${idx + 1}`} />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
