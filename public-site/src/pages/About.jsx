import React, { useRef } from 'react';
import { motion, useScroll, useSpring, useReducedMotion } from 'framer-motion';
import { Eye, Target, Sparkles, Heart, Recycle, ShieldCheck, Users } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PageBanner from '../components/layout/PageBanner';
import SectionTitle from '../components/ui/SectionTitle';
import aboutImgDefault from '../assets/about.png';
import DOMPurify from 'dompurify';
import { useCMSData } from '../hooks/useCMSData';
import SafeImage from '../components/ui/SafeImage';

const iconMap = {
  ShieldCheck,
  Users,
  Recycle,
  Heart,
  Sparkles,
  Target,
  Eye,
};

const About = () => {
  const shouldReduceMotion = useReducedMotion();
  const timelineRef = useRef(null);

  const aboutData = useCMSData('about') || {};
  const main = aboutData.main || {};
  const missionVision = aboutData.missionVision || {};
  const timelineEvents = aboutData.timeline || [];
  const values = aboutData.values || [];

  const rawTeam = useCMSData('team') || [];
  const team = Array.isArray(rawTeam) ? rawTeam.filter((m) => m.active !== false) : [];

  // Scroll scroll-progress hooks
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ['start center', 'end center'],
  });
  const pathLength = useSpring(scrollYProgress, { stiffness: 400, damping: 90 });

  const pageTransition = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: 'easeOut' },
      };

  const cardVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
  };

  const settings = useCMSData('settings');
  const canonicalBase = settings?.seo?.canonicalUrl || 'https://lakshyafordevelopment.org';
  const canonicalUrl = `${canonicalBase}/about`;

  return (
    <motion.div {...pageTransition} className="pt-20 relative bg-clay-gradient min-h-screen">
      <Helmet>
        <title>About Us | Lakshya Society</title>
        <meta name="description" content="Learn about Lakshya Society, founded in 2006. Read about our journey, core values, mission to promote social progress and environmental health, and meet our team." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="About Us | Lakshya Society" />
        <meta property="og:description" content="Learn about Lakshya Society, founded in 2006. Read about our journey, core values, mission to promote social progress and environmental health, and meet our team." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About Us | Lakshya Society" />
        <meta name="twitter:description" content="Learn about Lakshya Society — our journey, core values, and mission for social progress and environmental health since 2006." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
      </Helmet>

      <div className="relative z-10">
        <PageBanner
          title="About Us"
          subtitle="Dedicated to social progress, girls' empowerment, and environmental health since 2006."
          bgImage={main.image || aboutImgDefault}
        />

        {/* Mission & Vision Section */}
        <section className="py-20 bg-cream/30">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Mission Card */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="glass border-l-4 border-l-forest-500 p-8 md:p-12 rounded-2xl flex flex-col items-start space-y-4 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <div className="p-3 bg-forest-500/10 rounded-xl text-forest-600">
                <Target className="w-8 h-8" />
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-charcoal">
                {missionVision.missionTitle || "Our Mission"}
              </h2>
              <div 
                className="text-earth-600 font-sans leading-relaxed font-light prose prose-earth prose-p:mb-2 prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4 [&_a]:text-forest-600 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(missionVision.missionBody || "To promote sustainable, community-driven social and environmental health across cities and villages.") }} 
              />
            </motion.div>

            {/* Vision Card */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              className="glass border-l-4 border-l-earth-500 p-8 md:p-12 rounded-2xl flex flex-col items-start space-y-4 shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              <div className="p-3 bg-earth-500/10 rounded-xl text-earth-600">
                <Eye className="w-8 h-8" />
              </div>
              <h2 className="font-display font-bold text-2xl md:text-3xl text-charcoal">
                {missionVision.visionTitle || "Our Vision"}
              </h2>
              <div 
                className="text-earth-600 font-sans leading-relaxed font-light prose prose-earth prose-p:mb-2 prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4 [&_a]:text-earth-600 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(missionVision.visionBody || "A balanced society where human development and nature coexist in harmony.") }} 
              />
            </motion.div>
          </div>
        </section>

        {/* Our Story Timeline */}
        {timelineEvents.length > 0 && (
          <section ref={timelineRef} className="py-20 md:py-28 bg-mist/40 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
              <SectionTitle
                eyebrow="Our Journey"
                title="Our Story Timeline"
                subtitle="Follow our milestones from a small spark of activism in 2006 to reaching thousands of lives."
                align="center"
              />

              <div className="relative mt-16 pb-12">
                {/* High-performance scroll animated line */}
                <div className="absolute left-[22px] md:left-[calc(50%-2px)] top-0 bottom-0 w-[4px] bg-forest-200/30 z-0 rounded-full overflow-hidden">
                  <motion.div
                    className="w-full h-full bg-forest-500 rounded-full"
                    style={{ scaleY: pathLength, transformOrigin: 'top' }}
                  />
                </div>

                <div className="space-y-12">
                  {timelineEvents.map((evt, idx) => {
                    const isEven = idx % 2 === 0;
                    return (
                      <div
                        key={evt.year}
                        className={`relative flex flex-col md:flex-row items-start ${
                          isEven ? 'md:flex-row-reverse' : ''
                        } md:justify-between`}
                      >
                        {/* Glass circle node dot with spring pop animation */}
                        <motion.div
                          initial={shouldReduceMotion ? {} : { scale: 0.6, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true, margin: '-60px' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                          className="absolute left-[6px] md:left-[calc(50%-18px)] top-1.5 z-10"
                        >
                          <div className="relative w-[36px] h-[36px] rounded-full glass border-2 border-forest-500 flex items-center justify-center cursor-pointer group hover:scale-110 transition-transform duration-300">
                            <span className="w-3.5 h-3.5 rounded-full bg-forest-500 group-hover:bg-forest-600 transition-colors" />
                          </div>
                        </motion.div>

                        <motion.div
                          className="ml-12 md:ml-0 w-[calc(100%-3rem)] md:w-[45%] glass p-6 md:p-8 rounded-2xl relative overflow-hidden shadow-md"
                          initial={
                            shouldReduceMotion
                              ? {}
                              : { opacity: 0, x: isEven ? 40 : -40 }
                          }
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true, margin: '-80px' }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        >
                          {/* Hover sweep sheen */}
                          {!shouldReduceMotion && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 pointer-events-none z-10"
                              initial={{ x: '-100%', skewX: -15 }}
                              whileHover={{ x: '200%' }}
                              transition={{ duration: 0.6 }}
                            />
                          )}

                          <span className="inline-block text-xs font-bold text-amber-500 font-sans tracking-widest uppercase mb-1">
                            {evt.year}
                          </span>
                          <h3 className="font-display font-semibold text-lg md:text-xl text-charcoal mb-2">
                            {evt.title}
                          </h3>
                          <div 
                            className="text-earth-600 font-sans text-sm md:text-base leading-relaxed font-light prose prose-sm prose-p:mb-2 prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4 [&_a]:text-earth-700 [&_a]:underline"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(evt.description) }}
                          />
                        </motion.div>

                        <div className="hidden md:block w-[45%]" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Our Values Section */}
        {values.length > 0 && (
          <section className="py-20 md:py-28 bg-cream/30">
            <div className="max-w-7xl mx-auto px-6">
              <SectionTitle
                eyebrow="Core Values"
                title="What drives our choices"
                subtitle="These foundational principles guide our team, program structures, and community connections."
                align="center"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mt-12">
                {values.map((val) => (
                  <motion.div
                    key={val.title}
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    className="glass-green p-8 rounded-2xl flex items-start space-x-6 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300"
                  >
                    {(() => {
                      const IconComponent = iconMap[val.iconName] || ShieldCheck;
                      return (
                        <div className="p-3 bg-white/20 rounded-xl text-forest-500 shrink-0 border border-white/25 shadow-inner relative z-10 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                          <IconComponent className="w-8 h-8 text-forest-500" />
                        </div>
                      );
                    })()}
                    <div className="space-y-2 relative z-10">
                      <h3 className="font-display font-semibold text-xl text-forest-900">{val.title}</h3>
                      <div 
                        className="text-forest-900/80 font-sans text-sm md:text-base leading-relaxed font-light prose prose-forest prose-p:mb-2 prose-ul:list-disc prose-ul:ml-4 prose-ol:list-decimal prose-ol:ml-4 [&_a]:text-forest-700 [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(val.description) }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Team Section */}
        {team.length > 0 && (
          <section className="py-20 md:py-28 bg-mist/40">
            <div className="max-w-7xl mx-auto px-6">
              <SectionTitle
                eyebrow="Our Team"
                title="The faces behind the work"
                subtitle="Meet the dreamers, organizers, and field leaders driving change every day."
                align="center"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
                {team.map((member, idx) => (
                  <motion.div
                    key={member.name}
                    className="glass p-6 rounded-2xl text-center flex flex-col items-center space-y-4 hover:shadow-xl hover:border-white/40 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden h-full group"
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    {/* Hover sheen */}
                    {!shouldReduceMotion && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 pointer-events-none z-10"
                        initial={{ x: '-100%', skewX: -15 }}
                        whileHover={{ x: '200%' }}
                        transition={{ duration: 0.6 }}
                      />
                    )}

                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-forest-500/20 shadow-inner">
                      <SafeImage
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-display font-semibold text-lg md:text-xl text-charcoal">
                        {member.name}
                      </h3>
                      {member.role && (
                        <p className="text-xs uppercase tracking-wider font-semibold font-sans text-forest-600">
                          {member.role}
                        </p>
                      )}
                      <p className="text-[10px] uppercase tracking-widest font-sans text-charcoal/50">
                        {member.department}
                      </p>
                    </div>

                    {/* Hover Card Overlay (Short Bio and Social Links) */}
                    <div className="absolute inset-0 translate-y-full group-hover:translate-y-0 bg-charcoal/95 backdrop-blur-md transition-transform duration-300 ease-out flex flex-col justify-center items-center p-6 text-center z-20">
                      <h4 className="font-display font-semibold text-cream text-lg mb-1 leading-tight">
                        {member.name}
                      </h4>
                      {member.role && (
                        <p className="text-forest-400 text-xs uppercase tracking-wider font-semibold mb-0.5">
                          {member.role}
                        </p>
                      )}
                      <p className="text-cream/50 text-[10px] uppercase tracking-widest mb-3">
                        {member.department}
                      </p>
                      <p className="text-cream/85 text-xs leading-relaxed line-clamp-5 mb-5 font-sans">
                        {member.bio || "Dedicated member supporting Lakshya's mission and community programs."}
                      </p>
                      
                      {/* Social handles (LinkedIn and WhatsApp) */}
                      <div className="flex items-center gap-3">
                        {member.linkedin && (
                          <a
                            href={member.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20 transition-all duration-300"
                            aria-label="LinkedIn"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                            </svg>
                          </a>
                        )}
                        {member.whatsapp && (
                          <a
                            href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20 transition-all duration-300"
                            aria-label="WhatsApp"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.8.983 3.834 1.502 5.913 1.503h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
};

export default About;
