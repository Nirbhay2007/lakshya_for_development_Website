import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import AnimatedCounter from '../ui/AnimatedCounter';
import aboutImgDefault from '../../assets/about.png';
import { useCMSData } from '../../hooks/useCMSData';
import SafeImage from '../ui/SafeImage';

const AboutPreview = () => {
  const shouldReduceMotion = useReducedMotion();
  const aboutData = useCMSData('about');
  const main = aboutData?.main || {};

  const imageVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' } },
  };

  const textVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: 'easeOut' } },
  };

  const badgeText = main.floatingBadge || "18+ Years of Impact";
  const badgeParts = badgeText.split(' ');
  const badgeVal = badgeParts[0];
  const badgeLabel = badgeParts.slice(1).join(' ');

  return (
    <section className="py-20 md:py-28 bg-cream relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
        
        {/* Left Column - Image inside Glass Frame + Offset backing */}
        <motion.div
          className="relative max-w-md md:max-w-lg mx-auto lg:mx-0 w-full"
          variants={shouldReduceMotion ? {} : imageVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {/* Offset Backing Frame */}
          <div className="absolute top-4 left-4 w-full h-full border-2 border-forest-500/30 rounded-3xl -z-10 pointer-events-none" />

          {/* Glass Image Container */}
          <div className="glass rounded-3xl p-3 shadow-xl relative z-10 overflow-hidden">
            <div className="rounded-[20px] overflow-hidden aspect-[4/3] bg-earth-500">
              <SafeImage
                src={main.image || aboutImgDefault}
                alt="Lakshya community volunteers sitting together"
                className="w-full h-full object-cover transform hover:scale-103 transition-transform duration-500"
              />
            </div>
          </div>

          {/* Floating Glass Stat Badge */}
          <motion.div
            className="absolute bottom-2 left-2 md:-bottom-6 md:-left-6 glass text-forest-700 py-3 px-4 md:py-4 md:px-6 rounded-2xl shadow-xl flex flex-col items-center justify-center z-20 min-w-[110px] md:min-w-[130px]"
            initial={shouldReduceMotion ? {} : { scale: 0.7, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', delay: 0.4 }}
          >
            <span className="font-display font-black text-3xl md:text-4xl text-forest-700 leading-none">
              <AnimatedCounter value={badgeVal} duration={2} />
            </span>
            <span className="text-[10px] uppercase tracking-wider font-sans font-bold text-forest-600/90 text-center mt-1.5 leading-tight">
               {badgeLabel}
            </span>
          </motion.div>
        </motion.div>

        {/* Right Column - Text Details with decorative quotes */}
        <motion.div
          className="relative space-y-6"
          variants={shouldReduceMotion ? {} : textVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {/* Decorative quotes behind text */}
          <span className="absolute -top-14 -left-8 font-display text-[150px] text-forest-500/8 select-none pointer-events-none leading-none">
            “
          </span>

          <div className="space-y-2 relative z-10">
            <span className="text-xs font-semibold uppercase tracking-widest text-forest-600 font-sans">
              {main.eyebrow || "Who We Are"}
            </span>
            <h2 className="font-display font-bold text-3xl md:text-5xl text-charcoal leading-tight">
              {main.headline || "Two promises made in 2006. Still kept today."}
            </h2>
          </div>

          <div 
            className="text-earth-600 font-sans md:text-lg leading-relaxed font-light prose prose-earth prose-p:mb-2 prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4 [&_a]:text-forest-600 [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: main.body || "Lakshya was born from a group of young activists who believed that environmental health and human dignity are inseparable." }}
          />

          {main.body2 && (
            <div 
              className="text-earth-600 font-sans md:text-lg leading-relaxed font-light prose prose-earth prose-p:mb-2 prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4 [&_a]:text-forest-600 [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: main.body2 }}
            />
          )}

          <div className="flex flex-wrap gap-4 pt-4 relative z-10">
            {main.primaryBtnLabel && (
              <Link to={main.primaryBtnLink || '/about'}>
                <button className="relative overflow-hidden inline-flex items-center justify-center font-sans font-semibold rounded-full px-7 py-3 text-base text-white bg-gradient-to-r from-forest-500 to-forest-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(46,125,50,0.25)] hover:from-forest-600 hover:to-forest-700 hover:scale-104 transition-all duration-300">
                  {main.primaryBtnLabel}
                </button>
              </Link>
            )}
            {main.secondaryBtnLabel && (
              <Link to={main.secondaryBtnLink || '/contact'}>
                <button className="inline-flex items-center justify-center font-sans font-semibold rounded-full px-7 py-3 text-base text-earth-700 bg-white/50 border border-earth-500/30 hover:bg-white/70 hover:scale-104 transition-all duration-300">
                  {main.secondaryBtnLabel}
                </button>
              </Link>
            )}
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default AboutPreview;
