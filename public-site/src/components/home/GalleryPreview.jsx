import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import SectionTitle from '../ui/SectionTitle';
import Button from '../ui/Button';
import { useCMSData } from '../../hooks/useCMSData';
import SafeImage from '../ui/SafeImage';

const GalleryPreview = () => {
  const shouldReduceMotion = useReducedMotion();
  const galleryData = useCMSData('gallery') || { images: [], videos: [] };
  const activeImages = Array.isArray(galleryData.images) ? galleryData.images.filter((img) => img.active !== false) : [];

  const featured = activeImages.find((img) => img.featured) || activeImages[0];
  const normalItems = activeImages.filter((img) => img.id !== featured?.id).slice(0, 4);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  if (activeImages.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-cream relative overflow-hidden">
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Heading */}
        <SectionTitle
          eyebrow="Moments in Action"
          title="Our work in pictures"
          subtitle="Every photo tells a story of grassroots connection, hope, and ecological commitment."
          align="center"
        />

        {/* Grid Layout (Featured + Normals) */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"
          variants={shouldReduceMotion ? {} : containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          
          {/* Featured Image - Spans 2 Columns */}
          {featured && (
            <motion.div
              variants={shouldReduceMotion ? {} : itemVariants}
              className="col-span-1 md:col-span-2 relative rounded-3xl overflow-hidden group shadow-lg border border-white/20 p-2.5 glass aspect-[16/9] md:aspect-[21/9] cursor-pointer"
            >
              {/* Shimmer sweep */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 pointer-events-none z-10"
                  initial={{ x: '-100%', skewX: -15 }}
                  whileHover={{ x: '200%' }}
                  transition={{ duration: 0.6 }}
                />
              )}

              <div className="w-full h-full rounded-[18px] overflow-hidden relative">
                <SafeImage
                  src={featured.image}
                  alt={featured.alt}
                  className="w-full h-full object-cover transform group-hover:scale-103 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              {/* Floating Glass Info Box bottom-left */}
              <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 z-20 glass p-3 md:p-5 rounded-2xl max-w-[calc(100%-1.5rem)] md:max-w-sm select-none">
                <span className="text-amber-500 text-[10px] uppercase tracking-widest font-black font-sans">
                  Featured Campaign · {featured.category}
                </span>
                <h4 className="font-display font-bold text-lg md:text-xl text-white mt-1.5 leading-snug">
                  {featured.caption || featured.alt}
                </h4>
              </div>
            </motion.div>
          )}

          {/* Normal Images */}
          {normalItems.map((item, idx) => (
            <motion.div
              key={idx}
              variants={shouldReduceMotion ? {} : itemVariants}
              className="relative rounded-2xl overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300 border border-white/20 p-2 glass aspect-[4/3] md:aspect-square lg:aspect-square cursor-pointer"
            >
              {/* Shimmer sweep */}
              {!shouldReduceMotion && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 pointer-events-none z-10"
                  initial={{ x: '-100%', skewX: -15 }}
                  whileHover={{ x: '200%' }}
                  transition={{ duration: 0.6 }}
                />
              )}

              <div className="w-full h-full rounded-[10px] overflow-hidden relative bg-forest-50">
                <SafeImage
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Glass Dark Hover Overlay sliding up */}
              <div className="absolute inset-x-2 bottom-2 h-[45%] glass-dark rounded-[10px] opacity-0 translate-y-10 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 flex flex-col justify-center p-4">
                <span className="inline-block text-[10px] font-black font-sans uppercase tracking-widest text-amber-400 mb-1">
                  {item.category}
                </span>
                <h4 className="font-display font-semibold text-sm md:text-base text-white">
                  {item.caption || item.alt}
                </h4>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* View Full Gallery CTA */}
        <div className="flex justify-center mt-12">
          <Link to="/gallery">
            <Button variant="outline" color="forest">
              View Full Gallery →
            </Button>
          </Link>
        </div>

      </div>
    </section>
  );
};

export default GalleryPreview;
