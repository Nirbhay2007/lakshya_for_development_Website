import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PageBanner from '../components/layout/PageBanner';
import SectionTitle from '../components/ui/SectionTitle';
import { useCMSData } from '../hooks/useCMSData';
import SafeImage from '../components/ui/SafeImage';

const Gallery = () => {
  const [filter, setFilter] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const galleryData = useCMSData('gallery') || { images: [], videos: [] };
  
  const galleryPhotos = useMemo(() => {
    return Array.isArray(galleryData.images) ? galleryData.images.filter((img) => img.active !== false) : [];
  }, [galleryData.images]);

  const videosList = useMemo(() => {
    return Array.isArray(galleryData.videos) ? galleryData.videos.filter((vid) => vid.active !== false) : [];
  }, [galleryData.videos]);

  const settingsData = useCMSData('settings') || {};
  const categoriesList = settingsData.categories || ['Adhaar', 'Vaidehi', 'Yagna', 'Events', 'General'];
  const filterTabs = ['All', ...categoriesList];

  // Helper to assign a dynamic aspect ratio for masonry grid layout
  const getAspect = (idx) => {
    const aspects = ['aspect-[3/4]', 'aspect-[3/2]', 'aspect-[1/1]', 'aspect-[4/3]', 'aspect-[3/2]', 'aspect-[4/3]'];
    return aspects[idx % aspects.length];
  };

  // Filter photos (memoized)
  const filteredPhotos = useMemo(() => {
    return filter === 'All'
      ? galleryPhotos
      : galleryPhotos.filter(item => (item.category || '').trim().toLowerCase() === filter.trim().toLowerCase());
  }, [filter, galleryPhotos]);

  // Lightbox handlers
  const openLightbox = (idx) => {
    const actualIndex = galleryPhotos.findIndex(p => p.image === filteredPhotos[idx].image);
    setLightboxIndex(actualIndex);
  };

  const closeLightbox = () => setLightboxIndex(null);

  const prevImage = (e) => {
    e.stopPropagation();
    setLightboxIndex(prev => (prev === 0 ? galleryPhotos.length - 1 : prev - 1));
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setLightboxIndex(prev => (prev === galleryPhotos.length - 1 ? 0 : prev + 1));
  };

  const pageTransition = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: 'easeOut' },
      };

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback((e) => {
    if (lightboxIndex === null) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') setLightboxIndex(prev => (prev === 0 ? galleryPhotos.length - 1 : prev - 1));
    if (e.key === 'ArrowRight') setLightboxIndex(prev => (prev === galleryPhotos.length - 1 ? 0 : prev + 1));
  }, [lightboxIndex, galleryPhotos.length]);

  // Attach/detach keyboard listener and lock body scroll
  useEffect(() => {
    if (lightboxIndex !== null) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxIndex, handleKeyDown]);

  const settings = useCMSData('settings');
  const canonicalBase = settings?.seo?.canonicalUrl || 'https://lakshyafordevelopment.org';
  const canonicalUrl = `${canonicalBase}/gallery`;

  return (
    <motion.div {...pageTransition} className="pt-20 relative bg-clay-gradient min-h-screen">
      <Helmet>
        <title>Media Gallery | Lakshya Society</title>
        <meta name="description" content="View photos and videos of Lakshya Society's community environment cleanups, pre-nursery classes, and women livelihood empowerment programmes." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Media Gallery | Lakshya Society" />
        <meta property="og:description" content="View photos and videos of Lakshya Society's community environment cleanups, pre-nursery classes, and women livelihood empowerment programmes." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Media Gallery | Lakshya Society" />
        <meta name="twitter:description" content="Photos and videos from Lakshya Society's community and environment programmes." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
      </Helmet>

      <div className="relative z-10">
        <PageBanner
          title="Our Work in Pictures"
          subtitle="Moments of community connection, environmental preservation, and grassroots education."
          bgImage="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1400&auto=format&fit=crop"
        />

        {/* Filter Tabs */}
        <section className="py-16 bg-cream/30">
          <div className="max-w-7xl mx-auto px-6">
            
            <div className="flex flex-wrap justify-center gap-1 bg-white/20 border border-white/20 p-1 rounded-full max-w-xl md:max-w-2xl mx-auto shadow-sm">
              {filterTabs.map((tab) => {
                const isActive = filter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilter(tab)}
                    className={`relative px-5 py-2 rounded-full text-xs md:text-sm font-semibold font-sans transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-charcoal/70 hover:text-forest-600'
                    }`}
                  >
                    <span className="relative z-10">{tab}</span>
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

            {/* Masonry Grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 mt-12">
              <AnimatePresence mode="popLayout">
                {filteredPhotos.map((item, idx) => (
                  <motion.div
                    key={item.image}
                    initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    onClick={() => openLightbox(idx)}
                    className="break-inside-avoid relative rounded-2xl overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-white/20 p-2 glass mb-6"
                  >
                    <div className={`${getAspect(idx)} w-full rounded-[10px] overflow-hidden bg-forest-50/50 relative`}>
                      <SafeImage
                        src={item.image}
                        alt={item.alt}
                        loading="lazy"
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      {/* Sliding Hover Overlay */}
                      <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out flex flex-col justify-end p-6 glass-dark text-left rounded-[10px] bg-black/60 border border-white/10">
                        <div className="mb-2">
                          <span className="inline-block text-charcoal text-[10px] font-bold uppercase tracking-widest font-sans px-2.5 py-0.5 bg-amber-400 rounded-full shadow-sm">
                            {item.category}
                          </span>
                        </div>
                        <h3 className="font-display font-semibold text-sm md:text-base text-cream leading-tight">
                          {item.caption || item.alt}
                        </h3>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Videos Section */}
        {videosList.length > 0 && (
          <section className="py-20 md:py-28 bg-mist/40 border-t border-forest-100/30">
            <div className="max-w-7xl mx-auto px-6">
              <SectionTitle
                eyebrow="Media Hub"
                title="Videos of our campaign"
                subtitle="Watch our teams in the field cleaning streets, educating children, and planting forests."
                align="center"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                {videosList.map((video, idx) => {
                  const isPlaying = playingVideo === idx;
                  return (
                    <div
                      key={idx}
                      className="glass-card rounded-2xl overflow-hidden flex flex-col relative"
                    >
                      {/* Video Player / Thumbnail */}
                      <div className="relative aspect-video bg-charcoal flex items-center justify-center overflow-hidden">
                        {isPlaying ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1`}
                            title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full border-0"
                          />
                        ) : (
                          <>
                            <SafeImage
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-full object-cover opacity-75"
                            />
                            <button
                              onClick={() => setPlayingVideo(idx)}
                              className="absolute p-4 rounded-full bg-forest-600 text-white shadow-xl hover:bg-forest-700 hover:scale-110 transition-all duration-300"
                              aria-label="Play video"
                            >
                              <Play className="w-6 h-6 fill-white" />
                            </button>
                          </>
                        )}
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-center bg-white/20">
                        <h3 className="font-display font-semibold text-base text-charcoal leading-snug">
                          {video.title}
                        </h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Full-screen Lightbox with backdrop blur and custom buttons */}
        <AnimatePresence>
          {lightboxIndex !== null && galleryPhotos[lightboxIndex] && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeLightbox}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 md:p-8"
            >
              {/* Close button - glass */}
              <button
                onClick={closeLightbox}
                className="absolute top-6 right-6 p-3 rounded-full glass hover:bg-white/25 text-white transition-colors border border-white/30"
                aria-label="Close Lightbox"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Prev / Next buttons - glass circles */}
              <button
                onClick={prevImage}
                className="absolute left-4 md:left-8 p-3.5 rounded-full glass hover:bg-white/25 text-white transition-colors border border-white/30 shadow-lg"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                onClick={nextImage}
                className="absolute right-4 md:right-8 p-3.5 rounded-full glass hover:bg-white/25 text-white transition-colors border border-white/30 shadow-lg"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <motion.div
                initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="max-w-4xl max-h-[80vh] flex flex-col space-y-4 items-center"
              >
                <SafeImage
                  src={galleryPhotos[lightboxIndex].image}
                  alt={galleryPhotos[lightboxIndex].alt}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl border border-white/20"
                />
                <div className="text-center text-white select-none">
                  <span className="text-xs uppercase tracking-wider font-sans text-amber-400 font-bold bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                    {galleryPhotos[lightboxIndex].category}
                  </span>
                  <p className="font-display font-medium text-lg md:text-xl mt-3 text-cream">
                    {galleryPhotos[lightboxIndex].caption || galleryPhotos[lightboxIndex].alt}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Gallery;
