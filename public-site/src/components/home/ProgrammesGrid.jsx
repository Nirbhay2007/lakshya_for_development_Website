import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SectionTitle from '../ui/SectionTitle';
import ProgrammeCard from '../ui/ProgrammeCard';
import { useCMSData } from '../../hooks/useCMSData';

const ProgrammesGrid = () => {
  const shouldReduceMotion = useReducedMotion();
  const rawProgrammes = useCMSData('programmes') || [];
  const programmes = Array.isArray(rawProgrammes) ? rawProgrammes.filter((p) => p.active) : [];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
      },
    },
  };

  return (
    <section className="py-20 md:py-28 bg-mist relative">
      {/* Background decoration blobs */}
      {!shouldReduceMotion && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[10%] -left-32 w-[500px] h-[500px] bg-forest-500 opacity-[0.08] liquid-blob" />
          <div className="absolute bottom-[10%] -right-32 w-[450px] h-[450px] bg-amber-400 opacity-[0.06] liquid-blob" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Section Heading */}
        <SectionTitle
          eyebrow="Our Initiatives"
          title="Six programmes. One mission."
          subtitle="Each programme addresses a root cause. Together they build a system."
          align="center"
        />

        {/* Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12"
          variants={shouldReduceMotion ? {} : containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {programmes.map((prog) => (
            <ProgrammeCard
              key={prog.title}
              title={prog.title}
              tag={prog.eyebrow}
              accentColor={prog.accentColor}
              gradientFrom={prog.gradientFrom}
              gradientTo={prog.gradientTo}
              description={prog.description}
            />
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default ProgrammesGrid;
