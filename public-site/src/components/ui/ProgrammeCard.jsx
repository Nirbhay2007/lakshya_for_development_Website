import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Sparkles, Recycle, Leaf, MessageSquare, Compass } from 'lucide-react';

// Icon mapper for programs
const iconMap = {
  Adhaar: <BookOpen className="w-7 h-7" />,
  Vaidehi: <Sparkles className="w-7 h-7" />,
  Yagna: <Leaf className="w-7 h-7" />,
  Vaimalya: <Recycle className="w-7 h-7" />,
  Charcha: <MessageSquare className="w-7 h-7" />,
  'Litter Free India': <Compass className="w-7 h-7" />,
};

const ProgrammeCard = ({
  title,
  description,
  accentColor,
  gradientFrom,
  gradientTo,
  tag,
  path = '/programmes',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const IconComponent = iconMap[title] || <BookOpen className="w-7 h-7" />;

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 25 } },
  };

  const interactiveVariants = shouldReduceMotion
    ? {}
    : {
        hover: {
          backgroundColor: 'rgba(255, 255, 255, 0.18)',
          borderColor: 'rgba(255, 255, 255, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
          scale: 1.04,
          y: -6,
        },
      };

  return (
    <motion.div
      variants={cardVariants}
      className="relative rounded-3xl overflow-hidden shadow-lg border border-transparent h-full flex flex-col cursor-pointer"
      style={{
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
      }}
    >
      <motion.div
        variants={interactiveVariants}
        whileHover="hover"
        className="relative w-full flex-grow p-8 flex flex-col justify-between overflow-hidden bg-white/12 border border-white/30 rounded-3xl transition-colors duration-300"
      >
        {/* Shimmer sweep effect on hover */}
        {!shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/8 to-white/0 pointer-events-none"
            initial={{ x: '-100%', skewX: -15 }}
            whileHover={{ x: '200%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        )}

        {/* Morphing Blob Decoration (Rotates & grows on hover) */}
        {!shouldReduceMotion && (
          <motion.div
            className="absolute -top-8 -right-8 w-32 h-32 liquid-blob pointer-events-none"
            style={{ backgroundColor: accentColor, opacity: 0.22 }}
            variants={{
              hover: { rotate: 15, scale: 1.15, opacity: 0.3 },
            }}
            transition={{ duration: 0.4 }}
          />
        )}

        {/* Top Zone: Icon & Tag / Dot */}
        <div className="flex items-center justify-between z-10 relative">
          <div className="p-3 bg-white/10 rounded-2xl border border-white/15 text-white shadow-inner">
            {IconComponent}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-sans tracking-widest font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
              {tag}
            </span>
            <span
              className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.7)]"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>

        {/* Middle Zone: Content details */}
        <div className="mt-8 flex-grow flex flex-col justify-between z-10 relative">
          <div>
            <h3 className="font-display font-bold text-2xl text-cream">
              {title}
            </h3>
            <p className="text-white/80 font-sans text-sm font-light leading-relaxed mt-2.5">
              {description}
            </p>
          </div>

          <div>
            <div className="border-t border-white/15 my-4" />
            <Link
              to={path}
              className="inline-flex items-center text-sm font-bold tracking-wide text-amber-400 hover:text-amber-300 transition-colors group"
            >
              <span>Learn More</span>
              <motion.span
                className="ml-1.5"
                variants={shouldReduceMotion ? {} : { hover: { x: 6 } }}
                transition={{ duration: 0.3 }}
              >
                →
              </motion.span>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProgrammeCard;
