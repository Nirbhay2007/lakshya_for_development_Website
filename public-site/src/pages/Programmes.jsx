import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import PageBanner from '../components/layout/PageBanner';
import Button from '../components/ui/Button';
import { useCMSData } from '../hooks/useCMSData';
import SafeImage from '../components/ui/SafeImage';

const Programmes = () => {
  const rawProgrammes = useCMSData('programmes');
  
  const programmesDetail = useMemo(() => {
    const list = rawProgrammes || [];
    return Array.isArray(list) ? list.filter((p) => p.active !== false) : [];
  }, [rawProgrammes]);

  const [activeTab, setActiveTab] = useState('');
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (programmesDetail.length > 0 && !activeTab) {
      setActiveTab(programmesDetail[0].id);
    }
  }, [programmesDetail, activeTab]);

  // Scrollspy logic
  useEffect(() => {
    if (programmesDetail.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-30% 0px -55% 0px',
      threshold: 0.1,
    };

    const handleIntersect = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);
    programmesDetail.forEach((prog) => {
      const el = document.getElementById(prog.id);
      if (el) observer.observe(el);
    });

    return () => {
      programmesDetail.forEach((prog) => {
        const el = document.getElementById(prog.id);
        if (el) observer.unobserve(el);
      });
    };
  }, [programmesDetail]);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 180;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const pageTransition = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: 'easeOut' },
      };

  if (programmesDetail.length === 0) {
    return (
      <div className="w-full h-[90vh] bg-cream flex items-center justify-center">
        <p>Loading Programmes...</p>
      </div>
    );
  }

  const settings = useCMSData('settings');
  const canonicalBase = settings?.seo?.canonicalUrl || 'https://lakshyafordevelopment.org';
  const canonicalUrl = `${canonicalBase}/programmes`;

  return (
    <motion.div {...pageTransition} className="pt-20 relative bg-clay-gradient min-h-screen">
      <Helmet>
        <title>Our Programmes | Lakshya Society</title>
        <meta name="description" content="Explore Lakshya Society's key initiatives including Adhaar Classes for education, Vaidehi Empowerment for girls, and the Litter Free India environment campaign." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Our Programmes | Lakshya Society" />
        <meta property="og:description" content="Explore Lakshya Society's key initiatives including Adhaar Classes for education, Vaidehi Empowerment for girls, and the Litter Free India environment campaign." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Programmes | Lakshya Society" />
        <meta name="twitter:description" content="Education, girls' empowerment, and environment campaigns by Lakshya Society." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
      </Helmet>

      <div className="relative z-10">
        <PageBanner
          title="Our Programmes"
          subtitle="Six interconnected campaigns fighting for social dignity, childhood education, and clean air."
          bgImage="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1400&auto=format&fit=crop"
        />

        {/* Sticky Program Nav Tabs - Redesigned as glass pill wrapper with activeTab layout slider */}
        <div className="sticky top-[86px] z-30 px-4 sm:px-6 mt-4">
          <div className="max-w-6xl mx-auto glass rounded-full p-1 shadow-md flex justify-start md:justify-center items-center space-x-1 overflow-x-auto no-scrollbar">
            {programmesDetail.map((prog) => {
              const isActive = activeTab === prog.id;
              return (
                <button
                  key={prog.id}
                  onClick={() => scrollToSection(prog.id)}
                  className={`relative px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold font-sans whitespace-nowrap transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-charcoal/70 hover:text-forest-600'
                  }`}
                >
                  <span className="relative z-10">{prog.title}</span>
                  {isActive && !shouldReduceMotion && (
                    <motion.span
                      layoutId="activeTab"
                      className="absolute inset-0 bg-forest-500 rounded-full shadow-sm"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  {isActive && shouldReduceMotion && (
                    <span className="absolute inset-0 bg-forest-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Sections */}
        <div className="divide-y divide-forest-100/30">
          {programmesDetail.map((prog, idx) => {
            const isEven = idx % 2 === 0;
            const bgGrad = `linear-gradient(to bottom, ${prog.gradientFrom}26 0%, ${prog.gradientTo}26 100%)`;
            return (
              <section
                key={prog.id}
                id={prog.id}
                className="py-16 md:py-20 scroll-mt-48"
                style={{ background: bgGrad }}
              >
                <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 bg-white/95 border border-white/30 rounded-3xl shadow-lg">
                  <div className={`grid grid-cols-1 lg:grid-cols-12 gap-12 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                    
                    {/* Image Section wrapped in a glass frame */}
                    <motion.div
                      className={`lg:col-span-7 w-full ${isEven ? 'lg:order-1' : 'lg:order-2'}`}
                      initial={shouldReduceMotion ? {} : { opacity: 0, x: isEven ? -40 : 40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.6 }}
                    >
                      <div className="glass rounded-[28px] p-3 shadow-xl overflow-hidden relative z-10 w-full">
                        <div className="rounded-[20px] overflow-hidden aspect-[16/10] bg-forest-50/50">
                          <SafeImage
                            src={prog.image}
                            alt={prog.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    </motion.div>

                    {/* Text Description with floating glass stats badge */}
                    <motion.div
                      className={`lg:col-span-5 space-y-6 relative ${isEven ? 'lg:order-2' : 'lg:order-1'}`}
                      initial={shouldReduceMotion ? {} : { opacity: 0, x: isEven ? 40 : -40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.6 }}
                    >
                      {/* Floating Glass Stats badge */}
                      <div className="absolute -top-10 right-0 glass px-4 py-2 rounded-xl border border-white/30 shadow-md text-xs font-bold font-sans text-forest-700 tracking-wide select-none">
                        {prog.stat}
                      </div>

                      <div className="space-y-2">
                        <span
                          style={{ color: prog.accentColor }}
                          className="text-xs font-bold uppercase tracking-widest font-sans"
                        >
                          {prog.eyebrow}
                        </span>
                        <h2 className="font-display font-bold text-2xl md:text-3xl lg:text-4xl text-charcoal leading-tight">
                          {prog.title} — {prog.heading}
                        </h2>
                      </div>

                      <div className="space-y-4 text-earth-600 font-sans text-sm md:text-base font-light leading-relaxed">
                        {prog.paragraphs && Array.isArray(prog.paragraphs) && prog.paragraphs.map((p, pIdx) => (
                          <p key={pIdx}>{p}</p>
                        ))}
                      </div>

                      <div className="pt-2">
                        <Link to="/donate">
                          <Button
                            variant="filled"
                            style={{ backgroundColor: prog.accentColor }}
                            className="text-white hover:brightness-95 border-0 focus:ring-opacity-50 font-bold shadow-md"
                          >
                            Get Involved →
                          </Button>
                        </Link>
                      </div>
                    </motion.div>

                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default Programmes;
