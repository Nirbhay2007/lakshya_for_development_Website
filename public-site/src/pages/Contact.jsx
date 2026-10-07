import React, { useState, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Phone, Mail, MapPin } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PageBanner from '../components/layout/PageBanner';
import FormField from '../components/ui/FormField';
import { useCMSData } from '../hooks/useCMSData';

const getCleanMapUrl = (url) => {
  if (!url) return '';
  const trimmed = url.trim();
  // If they pasted the full HTML iframe tag (standard Google Maps Copy HTML)
  if (trimmed.startsWith('<iframe') || trimmed.includes('src=')) {
    const match = trimmed.match(/src="([^"]+)"/) || trimmed.match(/src='([^']+)'/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return trimmed;
};

const Contact = () => {
  const [formState, setFormState] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const contactData = useCMSData('contact') || { headOffice: {}, regionalOffices: [], formSettings: {}, mapSettings: {} };
  const headOffice = contactData.headOffice || {};
  
  const offices = useMemo(() => {
    return Array.isArray(contactData.regionalOffices) ? contactData.regionalOffices.filter((o) => o.active !== false) : [];
  }, [contactData.regionalOffices]);

  const formSettings = contactData.formSettings || {};
  const mapSettings = contactData.mapSettings || {};

  const isFieldRequired = (fieldName) => {
    const required = formSettings.requiredFields || ['name', 'subject', 'message'];
    return required.includes(fieldName);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const service = formSettings.emailService || 'demo';
    const prefix = formSettings.subjectPrefix || 'Lakshya Enquiry: ';
    const subject = `${prefix}${formState.subject}`;

    try {
      if (service === 'web3forms') {
        if (!formSettings.web3formsKey) {
          throw new Error('Web3Forms Access Key is not configured in the CMS settings.');
        }
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            access_key: formSettings.web3formsKey,
            name: formState.name,
            email: formState.email,
            phone: formState.phone,
            subject: subject,
            message: formState.message,
            from_name: 'Lakshya NGO Public Site',
          }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || 'Web3Forms API request failed.');
        }
      } else if (service === 'formspree') {
        if (!formSettings.formspreeFormId) {
          throw new Error('Formspree Form ID is not configured in the CMS settings.');
        }
        const res = await fetch(`https://formspree.io/f/${formSettings.formspreeFormId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            name: formState.name,
            email: formState.email,
            phone: formState.phone,
            subject: subject,
            message: formState.message,
          }),
        });
        const result = await res.json();
        if (!res.ok) {
          throw new Error(result.error || 'Formspree API request failed.');
        }
      } else if (service === 'emailjs') {
        if (!formSettings.emailjsServiceId || !formSettings.emailjsTemplateId || !formSettings.emailjsPublicKey) {
          throw new Error('EmailJS Service ID, Template ID, or Public Key is missing in CMS settings.');
        }
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service_id: formSettings.emailjsServiceId,
            template_id: formSettings.emailjsTemplateId,
            user_id: formSettings.emailjsPublicKey,
            template_params: {
              from_name: formState.name,
              reply_to: formState.email,
              phone: formState.phone,
              subject: subject,
              message: formState.message,
            },
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'EmailJS API request failed.');
        }
      } else if (service === 'smtp') {
        const res = await fetch('/api/email/dispatch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'Contact Form',
            name: formState.name,
            email: formState.email,
            phone: formState.phone,
            subject: formState.subject,
            message: formState.message,
          }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || 'SMTP local server dispatch failed.');
        }
      } else if (service === 'webhook') {
        if (!formSettings.webhookUrl) {
          throw new Error('Custom Webhook URL is not configured in CMS settings.');
        }
        const res = await fetch(formSettings.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formState.name,
            email: formState.email,
            phone: formState.phone,
            subject: subject,
            message: formState.message,
            timestamp: new Date().toISOString(),
          }),
        });
        if (!res.ok) {
          throw new Error(`Webhook endpoint returned HTTP status ${res.status}`);
        }
      } else {
        // Fallback: demo simulation
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      // After successful submission via any service, also trigger SMTP auto-responder in background
      // The server will check if SMTP is enabled and skip if not
      if (service !== 'smtp') {
        try {
          fetch('/api/email/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'Contact Form',
              name: formState.name,
              email: formState.email,
              phone: formState.phone,
              subject: formState.subject,
              message: formState.message,
              autoResponderOnly: true,
            }),
          }).catch(() => {}); // fire-and-forget, don't block the user
        } catch (e) { /* ignore */ }
      }

      setIsSubmitted(true);
    } catch (err) {
      console.error('Failed to submit contact form:', err);
      setSubmitError(err.message || 'Something went wrong while sending your message. Please try again.');
    } finally {
      setIsSubmitting(false);
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

  const settings = useCMSData('settings');
  const canonicalBase = settings?.seo?.canonicalUrl || 'https://lakshyafordevelopment.org';
  const canonicalUrl = `${canonicalBase}/contact`;

  return (
    <motion.div {...pageTransition} className="pt-20 relative bg-clay-gradient min-h-screen">
      <Helmet>
        <title>Contact Us | Lakshya Society</title>
        <meta name="description" content="Get in touch with Lakshya Society. Contact our head office or regional centers to support, volunteer, or partner in social and environmental progress." />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content="Contact Us | Lakshya Society" />
        <meta property="og:description" content="Get in touch with Lakshya Society. Contact our head office or regional centers to support, volunteer, or partner in social and environmental progress." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact Us | Lakshya Society" />
        <meta name="twitter:description" content="Reach out to Lakshya Society to support, volunteer, or partner with us." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
      </Helmet>

      <div className="relative z-10">
        <PageBanner
          title="Let's Talk"
          subtitle="Have questions? Want to volunteer, sponsor, or visit our programs? Reach out to us."
          bgImage="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1400&auto=format&fit=crop"
        />

        {/* Main Section on a forest gradient background */}
        <section className="py-20 bg-gradient-to-br from-forest-700 to-forest-900 text-white relative">

          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start relative z-10">
            
            {/* Left Column: Glass Form on Dark Forest BG */}
            <div className="lg:col-span-7 glass p-8 md:p-12 rounded-3xl space-y-8 shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col justify-center">
              {/* Shimmer effect */}
              {!shouldReduceMotion && !isSubmitted && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/5 to-white/0 pointer-events-none z-10"
                  initial={{ x: '-100%', skewX: -15 }}
                  whileHover={{ x: '200%' }}
                  transition={{ duration: 0.6 }}
                />
              )}

              {isSubmitted ? (
                <motion.div
                  initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6 flex flex-col items-center justify-center py-8"
                >
                  <div className="w-16 h-16 bg-forest-500/20 text-forest-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-forest-500/20">
                    <svg className="w-8 h-8 stroke-current" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display font-bold text-2xl md:text-3xl text-charcoal">Thank You!</h2>
                    <p className="text-forest-600 font-semibold text-sm">Message Successfully Sent</p>
                  </div>
                  <p className="text-charcoal/70 text-sm md:text-base font-sans font-light max-w-md mx-auto leading-relaxed">
                    We have received your message regarding <strong className="text-forest-700 font-semibold">"{formState.subject || 'general inquiry'}"</strong>. Our coordination team will respond to <strong className="text-forest-700 font-semibold">{formState.email}</strong> as soon as possible.
                  </p>

                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormState({ name: '', email: '', phone: '', subject: '', message: '' });
                    }}
                    className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 bg-forest-600 hover:bg-forest-700 text-white font-sans font-semibold text-sm rounded-full transition-colors shadow-md"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <>
                  <div className="space-y-2">
                    <h2 className="font-display font-bold text-2xl md:text-3xl text-charcoal">Send Us a Message</h2>
                    <p className="text-charcoal/70 text-sm md:text-base font-sans font-light">
                      Fill in the form below and our regional coordination team will respond within 24 hours.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Name Input */}
                    <FormField
                      label="Full Name"
                      id="floating_name"
                      name="name"
                      value={formState.name}
                      onChange={handleInputChange}
                      required={isFieldRequired('name')}
                      shouldReduceMotion={shouldReduceMotion}
                      maxLength={100}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Email Input */}
                      <FormField
                        label="Email Address (Optional)"
                        id="floating_email"
                        name="email"
                        type="email"
                        value={formState.email}
                        onChange={handleInputChange}
                        required={isFieldRequired('email')}
                        shouldReduceMotion={shouldReduceMotion}
                        maxLength={254}
                      />

                      {/* Phone Input */}
                      {formSettings.enablePhoneField !== false && (
                        <FormField
                          label="Phone Number"
                          id="floating_phone"
                          name="phone"
                          type="tel"
                          value={formState.phone}
                          onChange={handleInputChange}
                          required={isFieldRequired('phone')}
                          shouldReduceMotion={shouldReduceMotion}
                          maxLength={15}
                          pattern="[0-9+\-\s]{7,15}"
                        />
                      )}
                    </div>

                    {/* Subject Input */}
                    <FormField
                      label="Subject"
                      id="floating_subject"
                      name="subject"
                      value={formState.subject}
                      onChange={handleInputChange}
                      required={isFieldRequired('subject')}
                      shouldReduceMotion={shouldReduceMotion}
                      maxLength={200}
                    />

                    {/* Message Box */}
                    <FormField
                      label="Your Message"
                      id="floating_message"
                      name="message"
                      value={formState.message}
                      onChange={handleInputChange}
                      textarea
                      required={isFieldRequired('message')}
                      shouldReduceMotion={shouldReduceMotion}
                      maxLength={2000}
                    />

                    {/* Error message */}
                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-xs font-sans leading-relaxed text-left flex gap-2.5 items-start"
                      >
                        <svg className="w-4.5 h-4.5 stroke-current text-red-400 shrink-0 mt-0.5" fill="none" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <div>
                          <span className="font-bold">Error:</span> {submitError}
                        </div>
                      </motion.div>
                    )}

                    {/* Submit button: full-width, gradient, ripple tap */}
                    <div className="pt-2">
                      <motion.button
                        id="contact_submit_btn"
                        type="submit"
                        disabled={isSubmitting}
                        whileHover={shouldReduceMotion || isSubmitting ? {} : { scale: 1.02 }}
                        whileTap={shouldReduceMotion || isSubmitting ? {} : { scale: 0.97 }}
                        className={`w-full relative overflow-hidden inline-flex items-center justify-center font-sans font-semibold rounded-full px-8 py-4 text-base text-white bg-gradient-to-r from-forest-500 to-forest-600 hover:from-forest-600 hover:to-forest-700 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_12px_rgba(0,0,0,0.15)] outline-none ${
                          isSubmitting ? 'opacity-80 cursor-not-allowed' : ''
                        }`}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </span>
                        ) : (
                          <>
                            {/* Shimmer sweep */}
                            {!shouldReduceMotion && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 pointer-events-none"
                                initial={{ x: '-100%', skewX: -15 }}
                                whileHover={{ x: '200%' }}
                                transition={{ duration: 0.6 }}
                              />
                            )}
                            <span>Send Message</span>
                          </>
                        )}
                      </motion.button>
                    </div>

                  </form>
                </>
              )}
            </div>

            {/* Right Column: Contact Cards + Maps (Dark glass panel on dark forest BG) */}
            <div className="lg:col-span-5 space-y-8 w-full">
              
              <div className="glass-dark p-8 rounded-3xl shadow-2xl space-y-6">
                <h3 className="font-display font-semibold text-xl text-cream">Direct Contacts</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-white/5 rounded-xl text-amber-400 shrink-0 border border-white/10 shadow-inner">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-sans font-semibold text-sm text-cream">Main Office</h4>
                      <p className="font-sans text-sm text-cream/70 leading-relaxed font-light mt-0.5">
                        {headOffice.address1 || "12, Sector 8"}, {headOffice.address2 || "Vikas Nagar"}, {headOffice.cityStatePin || "Lucknow, Uttar Pradesh - 226022"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/5 rounded-xl text-amber-400 shrink-0 border border-white/10 shadow-inner">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-sans font-semibold text-sm text-cream">Email Support</h4>
                      <p className="font-sans text-sm text-cream/70 font-light mt-0.5">{headOffice.email || "info@lakshyafordevelopment.org"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map box upgraded to glass card */}
              <div className="glass-dark rounded-3xl p-4 overflow-hidden shadow-2xl min-h-[300px]">
                {mapSettings.embedUrl ? (
                  <iframe
                    src={getCleanMapUrl(mapSettings.embedUrl)}
                    width="100%"
                    height="100%"
                    className="border-0 rounded-2xl h-full w-full min-h-[250px]"
                    allowFullScreen=""
                    loading="lazy"
                    title="Google Map Embed"
                  />
                ) : (
                  <div className="relative w-full aspect-video rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center justify-center text-center p-6 overflow-hidden">
                    <div className="relative z-10 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-white/10 text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-white/10">
                        <MapPin className="w-6 h-6 animate-bounce" />
                      </div>
                      <div>
                        <h4 className="font-display font-semibold text-base text-cream">{mapSettings.markerLabel || "Vikas Nagar Office Map"}</h4>
                        <p className="text-xs text-cream/60 font-sans mt-0.5">Lucknow, Uttar Pradesh</p>
                      </div>
                      <a
                        href="https://maps.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2 border border-white/20 rounded-full text-xs font-semibold text-white bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </section>

        {/* Regional Offices */}
        {offices.length > 0 && (
          <section className="py-20 bg-cream">
            <div className="max-w-7xl mx-auto px-6">
              <div className="max-w-3xl mb-12">
                <span className="text-xs font-semibold uppercase tracking-widest text-forest-600 font-sans">
                  Regional Presence
                </span>
                <h2 className="font-display font-bold text-3xl md:text-4xl text-charcoal mt-1">Our Offices</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {offices.map((office) => (
                  <div
                    key={office.city}
                    className="glass p-6 md:p-8 rounded-2xl flex flex-col justify-between space-y-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-forest-600">
                        <MapPin className="w-5 h-5" />
                        <h3 className="font-display font-semibold text-lg text-charcoal">{office.city}</h3>
                      </div>
                      <p className="font-sans text-sm text-earth-600 leading-relaxed font-light">
                        {office.address}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-forest-100/30 text-xs font-sans text-earth-500 space-y-1 font-light">
                      <p><strong>Email:</strong> {office.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
};

export default Contact;
