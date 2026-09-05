import React, { useState, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FileText, ShieldAlert, ArrowUp, ListFilter, CheckCircle2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import PageBanner from '../components/layout/PageBanner';
import { useCMSData } from '../hooks/useCMSData';

const Legal = ({ type }) => {
  const shouldReduceMotion = useReducedMotion();
  const legalData = useCMSData('legal') || {};
  const settings = useCMSData('settings');

  const [activeSection, setActiveSection] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const pageData = legalData[type] || { 
    title: type === 'privacyPolicy' ? 'Privacy Policy' : type === 'refundPolicy' ? 'Refund Policy' : type === 'cancellationPolicy' ? 'Cancellation Policy' : 'Terms & Conditions', 
    lastUpdated: '', 
    content: '' 
  };
  
  const canonicalBase = settings?.seo?.canonicalUrl || 'https://lakshyafordevelopment.org';
  const pagePath = type === 'privacyPolicy' ? '/privacy-policy' : type === 'refundPolicy' ? '/refund-policy' : type === 'cancellationPolicy' ? '/cancellation-policy' : '/terms-conditions';
  const canonicalUrl = `${canonicalBase}${pagePath}`;

  // Extract table of contents headings and inject section IDs
  const { headings, processedContent } = useMemo(() => {
    if (!pageData.content) return { headings: [], processedContent: '' };
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(pageData.content, 'text/html');
    const h2Elements = Array.from(doc.querySelectorAll('h2'));
    
    const extracted = h2Elements.map((el, index) => {
      const text = el.textContent || `Section ${index + 1}`;
      const id = `legal-sec-${index + 1}`;
      return { id, text };
    });

    let count = 0;
    const formatted = pageData.content.replace(/<h2>/g, () => {
      count++;
      return `<h2 id="legal-sec-${count}" class="scroll-mt-28">`;
    });

    return { headings: extracted, processedContent: formatted };
  }, [pageData.content]);

  // Track scroll position for Floating Scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ScrollSpy: Auto-highlight active section in Table of Contents as user scrolls
  useEffect(() => {
    if (headings.length === 0) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-10% 0px -60% 0px', threshold: 0.1 }
    );

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageTransition = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
        transition: { duration: 0.35, ease: 'easeOut' },
      };

  const policyTabs = [
    { key: 'privacyPolicy', title: 'Privacy Policy', path: '/privacy-policy' },
    { key: 'termsConditions', title: 'Terms & Conditions', path: '/terms-conditions' },
    { key: 'refundPolicy', title: 'Refund Policy', path: '/refund-policy' },
    { key: 'cancellationPolicy', title: 'Cancellation Policy', path: '/cancellation-policy' }
  ];

  return (
    <motion.div {...pageTransition} className="pt-20 relative bg-clay-gradient min-h-screen">
      <Helmet>
        <title>{pageData.title} | {settings?.general?.siteName || 'Lakshya NGO'}</title>
        <meta name="description" content={`Official ${pageData.title} of Lakshya NGO. Last updated: ${pageData.lastUpdated || 'Recently'}.`} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${pageData.title} | ${settings?.general?.siteName || 'Lakshya NGO'}`} />
        <meta property="og:description" content={`Official ${pageData.title} of Lakshya NGO.`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={`${pageData.title} | ${settings?.general?.siteName || 'Lakshya NGO'}`} />
      </Helmet>

      <div className="relative z-10">
        <PageBanner
          title={pageData.title}
          subtitle={pageData.lastUpdated ? `Last updated: ${pageData.lastUpdated}` : 'Legal Terms & Policies'}
        />

        <section className="py-12 md:py-16 max-w-7xl mx-auto px-4 sm:px-6">

          {/* Quick Policy Switcher Bar */}
          <div className="flex items-center justify-start md:justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar border-b border-charcoal/10">
            {policyTabs.map((tab) => (
              <Link
                key={tab.key}
                to={tab.path}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  type === tab.key
                    ? 'bg-forest-600 text-white shadow-md scale-105'
                    : 'bg-white/50 text-charcoal/70 hover:bg-white/80 hover:text-charcoal border border-charcoal/10'
                }`}
              >
                {type === tab.key && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" />}
                <span>{tab.title}</span>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Sticky Table of Contents Sidebar (Desktop) */}
            {headings.length > 0 && (
              <div className="hidden lg:block lg:col-span-4 sticky top-28 space-y-4">
                <div className="glass p-6 rounded-3xl shadow-lg border border-white/30 space-y-4">
                  <div className="flex items-center gap-2 border-b border-charcoal/10 pb-3">
                    <ListFilter className="w-4 h-4 text-forest-600" />
                    <h3 className="font-display font-bold text-sm text-charcoal tracking-wide uppercase">Table of Contents</h3>
                  </div>
                  <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {headings.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all font-sans leading-snug flex items-center justify-between group ${
                          activeSection === item.id
                            ? 'bg-forest-500/15 text-forest-800 font-bold border-l-2 border-forest-600 pl-2.5'
                            : 'text-charcoal/70 hover:bg-white/60 hover:text-charcoal'
                        }`}
                      >
                        <span className="truncate">{item.text}</span>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className={`${headings.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12 max-w-4xl mx-auto'} w-full space-y-6`}>
              
              {/* Mobile Quick Jump Pills */}
              {headings.length > 0 && (
                <div className="lg:hidden glass p-4 rounded-2xl border border-white/20 space-y-2">
                  <span className="text-[11px] font-bold text-charcoal/60 uppercase tracking-wider block">Jump to section:</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {headings.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollToHeading(item.id)}
                        className="px-3 py-1.5 rounded-lg bg-white/70 hover:bg-white text-xs text-charcoal/80 whitespace-nowrap border border-charcoal/10 shrink-0 font-medium"
                      >
                        {item.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Text Document */}
              <div className="glass p-6 md:p-12 rounded-3xl shadow-xl border border-white/20">
                <div 
                  className="prose prose-forest max-w-none font-sans leading-relaxed text-charcoal/80 space-y-6 
                    prose-headings:font-display prose-headings:font-bold prose-headings:text-charcoal
                    prose-h2:text-xl md:prose-h2:text-2xl prose-h2:border-b prose-h2:border-charcoal/10 prose-h2:pb-2 prose-h2:mt-8 prose-h2:scroll-mt-28
                    prose-p:text-sm md:prose-p:text-base prose-p:font-light prose-p:leading-relaxed
                    prose-ul:list-disc prose-ul:pl-6 prose-ul:space-y-1.5
                    prose-ol:list-decimal prose-ol:pl-6 prose-ol:space-y-1.5"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processedContent || pageData.content || '<p>Content is being uploaded. Please check back soon.</p>') }}
                />
              </div>

            </div>

          </div>

        </section>
      </div>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-forest-700 text-white shadow-2xl hover:bg-forest-800 transition-all border border-white/20 flex items-center justify-center cursor-pointer"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}

    </motion.div>
  );
};

export default Legal;
