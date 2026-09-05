import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import HeroSlider from '../components/home/HeroSlider';
import EventsTicker from '../components/home/EventsTicker';
import AboutPreview from '../components/home/AboutPreview';
import ProgrammesGrid from '../components/home/ProgrammesGrid';
import ImpactNumbers from '../components/home/ImpactNumbers';
import GalleryPreview from '../components/home/GalleryPreview';
import PartnersMarquee from '../components/home/PartnersMarquee';
import WaveDivider from '../components/ui/WaveDivider';
import { useCMSData } from '../hooks/useCMSData';

const Home = () => {
  const shouldReduceMotion = useReducedMotion();
  const settings = useCMSData('settings');
  const canonicalBase = settings?.seo?.canonicalUrl || 'https://lakshyafordevelopment.org';
  const canonicalUrl = `${canonicalBase}/`;

  const transitionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15, ease: 'easeOut' },
      };

  return (
    <motion.div {...transitionProps} className="relative w-full bg-clay-gradient">
      <Helmet>
        <title>Lakshya Society | Social Progress & Environmental Health</title>
        <meta name="description" content="Lakshya Society is dedicated to community empowerment, girls' development, educational programmes, and promoting sustainable, green local environments in India since 2006." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Lakshya Society | Social Progress & Environmental Health" />
        <meta property="og:description" content="Lakshya Society is dedicated to community empowerment, girls' development, educational programmes, and promoting sustainable, green local environments in India since 2006." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Lakshya Society | Social Progress & Environmental Health" />
        <meta name="twitter:description" content="Dedicated to childhood education, girls' empowerment, and environmental preservation since 2006." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "name": "Lakshya NGO",
              "alternateName": "Lakshya Society for Social & Environmental Development",
              "url": canonicalBase,
              "logo": `${canonicalBase}/lakshya.png`,
              "description": "A registered non-profit organization dedicated to social welfare, environmental development, and community empowerment through education, sustainability, and livelihood programs since 2006.",
              "foundingDate": "2006",
              "sameAs": [
                "https://facebook.com",
                "https://instagram.com",
                "https://twitter.com",
                "https://youtube.com",
                "https://linkedin.com"
              ]
            },
            {
              "@type": "WebSite",
              "name": "Lakshya NGO",
              "url": canonicalBase,
              "description": "Lakshya Society is dedicated to community empowerment, girls' development, educational programmes, and promoting sustainable, green local environments in India since 2006."
            }
          ]
        })}</script>
      </Helmet>
      <div className="relative z-10">
        <HeroSlider />
        <EventsTicker />
        <WaveDivider nextBg="text-cream" />
        <AboutPreview />
        <WaveDivider nextBg="text-mist" />
        <ProgrammesGrid />
        <WaveDivider nextBg="text-charcoal" />
        <ImpactNumbers />
        <WaveDivider nextBg="text-cream" />
        <GalleryPreview />
        <WaveDivider nextBg="text-forest-600" />
        <PartnersMarquee />
      </div>
    </motion.div>
  );
};

export default Home;
