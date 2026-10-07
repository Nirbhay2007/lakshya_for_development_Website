import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import PageBanner from '../components/layout/PageBanner';
import Button from '../components/ui/Button';
import FormField from '../components/ui/FormField';
import { useCMSData } from '../hooks/useCMSData';
import { Briefcase, MapPin, Clock, ChevronRight, UserPlus, Send, Sparkles } from 'lucide-react';

const Career = () => {
  const careersData = useCMSData('careers') || { hero: {}, intro: {}, jobs: [] };
  const hero = careersData.hero || {};
  const intro = careersData.intro || {};
  const todayStr = new Date().toISOString().split('T')[0];
  const jobs = Array.isArray(careersData.jobs)
    ? careersData.jobs.filter((j) => {
        if (j.active === false) return false;
        if (j.publishDate && j.publishDate > todayStr) return false;
        return true;
      })
    : [];
  const volunteer = careersData.volunteer || {
    active: true,
    title: 'Become a Volunteer',
    description: 'If you don\'t find a matching vacancy but still wish to dedicate your time to childhood education or plantation projects, fill out our quick application below.',
    buttonText: 'Submit Application',
    successMessage: 'Thank you! Your volunteer application has been received successfully.',
    interests: [
      'Teaching / Education',
      'Environmental & Forestry',
      'Women Empowerment',
      'Campaigns & Events',
      'Operations & Support'
    ]
  };
  const shouldReduceMotion = useReducedMotion();

  const [volunteerForm, setVolunteerForm] = useState({
    name: '',
    email: '',
    phone: '',
    interest: volunteer.interests && volunteer.interests.length > 0 ? volunteer.interests[0] : 'Teaching / Education',
    message: ''
  });
  const [isVolunteering, setIsVolunteering] = useState(false);
  const [volunteerSubmitted, setVolunteerSubmitted] = useState(false);
  const [volunteerError, setVolunteerError] = useState(null);

  const contactData = useCMSData('contact') || { formSettings: {} };
  const formSettings = contactData.formSettings || {};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setVolunteerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();
    setIsVolunteering(true);
    setVolunteerError(null);

    const service = formSettings.emailService || 'demo';
    const prefix = 'Lakshya Volunteer Application: ';
    const subject = `${prefix}${volunteerForm.name} - ${volunteerForm.interest}`;

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
            name: volunteerForm.name,
            email: volunteerForm.email,
            phone: volunteerForm.phone,
            subject: subject,
            message: `Area of Interest: ${volunteerForm.interest}\n\nCover Letter / Bio: ${volunteerForm.message}`,
            from_name: 'Lakshya NGO Volunteer Panel',
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
            name: volunteerForm.name,
            email: volunteerForm.email,
            phone: volunteerForm.phone,
            subject: subject,
            message: `Area of Interest: ${volunteerForm.interest}\n\nCover Letter / Bio: ${volunteerForm.message}`,
          }),
        });
        if (!res.ok) {
          throw new Error('Formspree API submission failed.');
        }
      } else if (service === 'smtp') {
        const res = await fetch('/api/email/dispatch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'Volunteer Application',
            name: volunteerForm.name,
            email: volunteerForm.email,
            phone: volunteerForm.phone,
            subject: `Volunteer Apply - ${volunteerForm.interest}`,
            message: `Area of Interest: ${volunteerForm.interest}\n\nCover Letter / Bio: ${volunteerForm.message}`,
            jobTitle: volunteerForm.interest,
          }),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || 'SMTP local server dispatch failed.');
        }
      } else {
        // Simulation mode
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('Simulated volunteer submission:', volunteerForm);
      }

      // Trigger SMTP auto-responder in background (server checks if SMTP is enabled)
      if (service !== 'smtp') {
        try {
          fetch('/api/email/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'Volunteer Application',
              name: volunteerForm.name,
              email: volunteerForm.email,
              phone: volunteerForm.phone,
              subject: `Volunteer Apply - ${volunteerForm.interest}`,
              message: `Area of Interest: ${volunteerForm.interest}\n\nCover Letter / Bio: ${volunteerForm.message}`,
              jobTitle: volunteerForm.interest,
              autoResponderOnly: true,
            }),
          }).catch(() => {});
        } catch (e) { /* ignore */ }
      }

      setVolunteerSubmitted(true);
      const defaultInterest = (volunteer.interests && volunteer.interests.length > 0) ? volunteer.interests[0] : 'Teaching / Education';
      setVolunteerForm({ name: '', email: '', phone: '', interest: defaultInterest, message: '' });
    } catch (err) {
      console.error(err);
      setVolunteerError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsVolunteering(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
      };

  const settings = useCMSData('settings');
  const canonicalBase = settings?.seo?.canonicalUrl || 'https://lakshyafordevelopment.org';
  const canonicalUrl = `${canonicalBase}/career`;

  return (
    <div className="bg-clay-gradient min-h-screen">
      <Helmet>
        <title>{hero.title || 'Careers'} | Lakshya NGO</title>
        <meta
          name="description"
          content={hero.subtitle || 'Build your career with Lakshya. Explore job vacancies and volunteer listings.'}
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${hero.title || 'Careers'} | Lakshya NGO`} />
        <meta property="og:description" content={hero.subtitle || 'Build your career with Lakshya. Explore job vacancies and volunteer listings.'} />
        <meta property="og:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${hero.title || 'Careers'} | Lakshya NGO`} />
        <meta name="twitter:description" content={hero.subtitle || 'Explore job vacancies and volunteer opportunities at Lakshya NGO.'} />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=1200&auto=format&fit=crop" />
      </Helmet>

      <PageBanner
        title={hero.title || 'Join Our Team'}
        subtitle={hero.subtitle || 'Work with us to make a lasting impact on childhood education and the environment.'}
        bgImage={hero.bgImage || 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200'}
      />

      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 space-y-20">
        {/* Intro Section */}
        <motion.div
          className="max-w-3xl mx-auto text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block text-xs font-semibold tracking-widest text-forest-600 uppercase font-sans border-l-2 border-forest-600 pl-3">
            Our Culture
          </span>
          <h2 className="font-display font-bold text-3xl md:text-5xl text-charcoal leading-tight">
            {intro.title || 'Why Build Your Career at Lakshya?'}
          </h2>
          <p className="text-charcoal/70 font-sans font-light text-base md:text-lg leading-relaxed">
            {intro.description ||
              "At Lakshya NGO, we believe in community empowerment and environmental action. We provide an inclusive, passionate, and collaborative work environment where every individual can make a tangible difference in the field."}
          </p>
        </motion.div>

        {/* Vacancies Section */}
        <div className="space-y-10">
          <div className="border-b border-forest-100 pb-5 text-center sm:text-left">
            <h3 className="font-display font-semibold text-2xl md:text-3xl text-charcoal">
              Open Positions ({jobs.length})
            </h3>
            <p className="text-charcoal/60 text-sm mt-1">
              Explore available opportunities to work with us in the field or remotely.
            </p>
          </div>

          {jobs.length === 0 ? (
            <div className="glass p-12 text-center rounded-2xl border border-white/40 max-w-md mx-auto">
              <Briefcase className="w-12 h-12 text-forest-500/40 mx-auto mb-4" />
              <h4 className="font-display font-semibold text-lg text-charcoal mb-2">
                No Openings Right Now
              </h4>
              <p className="text-charcoal/75 text-sm font-sans mb-6">
                We aren't actively hiring for new positions at this moment, but we are always looking for passionate volunteers!
              </p>
              <Button href="/contact" variant="primary" size="md">
                Get in Touch
              </Button>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 gap-8 max-w-4xl mx-auto"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
            >
              {jobs.map((job) => (
                <motion.div
                  key={job.id}
                  variants={itemVariants}
                  className="glass p-6 md:p-8 rounded-2xl border border-white/50 hover:shadow-xl hover:border-white/80 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
                >
                  <div className="space-y-4 flex-1">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-forest-50 text-forest-700 border border-forest-100">
                        <Clock className="w-3 h-3" />
                        {job.type}
                      </span>
                      <h4 className="font-display font-bold text-xl md:text-2xl text-charcoal pt-1.5">
                        {job.title}
                      </h4>
                      <p className="text-charcoal/60 text-xs flex items-center gap-1.5 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-forest-500" />
                        {job.location}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      <p className="text-charcoal/75 text-sm leading-relaxed font-sans font-light">
                        <strong>Role Description:</strong> {job.description}
                      </p>
                      {job.requirements && (
                        <p className="text-charcoal/75 text-sm leading-relaxed font-sans font-light">
                          <strong>Requirements:</strong> {job.requirements}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 w-full md:w-auto text-left md:text-right">
                    <Button
                      href={job.applyUrl && job.applyUrl.trim() !== '' ? job.applyUrl : `/contact?subject=Application for ${encodeURIComponent(job.title)}`}
                      variant="primary"
                      size="md"
                      className="w-full md:w-auto justify-center"
                    >
                      Apply Now
                      <ChevronRight className="w-4 h-4 ml-1.5 shrink-0" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
        {/* Volunteer Application Panel */}
        {volunteer.active && (
          <motion.div
            className="max-w-3xl mx-auto mt-24 glass p-8 md:p-12 rounded-3xl border border-white/50 space-y-8 relative overflow-hidden"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="text-center space-y-3">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                <UserPlus className="w-3.5 h-3.5" />
                Volunteer Opportunity
              </span>
              <h3 className="font-display font-bold text-2xl md:text-4xl text-charcoal">
                {volunteer.title || 'Become a Volunteer'}
              </h3>
              <p className="text-charcoal/65 text-sm md:text-base font-sans font-light max-w-xl mx-auto">
                {volunteer.description || 'If you don\'t find a matching vacancy but still wish to dedicate your time to social work, apply below.'}
              </p>
            </div>

            {volunteerSubmitted ? (
              <motion.div 
                className="p-6 bg-forest-50 border border-forest-100 rounded-2xl text-center space-y-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-12 h-12 rounded-full bg-forest-100 flex items-center justify-center mx-auto text-forest-700">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-lg text-charcoal">
                    Application Submitted!
                  </h4>
                  <p className="text-charcoal/70 text-sm font-sans mt-1">
                    {volunteer.successMessage || 'Thank you! Your volunteer application has been received successfully.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVolunteerSubmitted(false)}
                  className="text-forest-600 hover:text-forest-700 text-sm font-sans font-medium underline underline-offset-2 transition-colors"
                >
                  Submit another application
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleVolunteerSubmit} className="space-y-8">
                {volunteerError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-sans">
                    {volunteerError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <FormField
                    label="Full Name"
                    id="vol_name"
                    name="name"
                    value={volunteerForm.name}
                    onChange={handleInputChange}
                    required
                    shouldReduceMotion={shouldReduceMotion}
                  />
                  <FormField
                    label="Email Address"
                    id="vol_email"
                    name="email"
                    type="email"
                    value={volunteerForm.email}
                    onChange={handleInputChange}
                    required
                    shouldReduceMotion={shouldReduceMotion}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    label="Phone Number"
                    id="vol_phone"
                    name="phone"
                    value={volunteerForm.phone}
                    onChange={handleInputChange}
                    required
                    shouldReduceMotion={shouldReduceMotion}
                  />
                  
                  <div className="relative w-full">
                    <select
                      name="interest"
                      id="vol_interest"
                      value={volunteerForm.interest}
                      onChange={handleInputChange}
                      className="block py-3.5 px-4 w-full text-base text-charcoal bg-white/60 rounded-xl border border-charcoal/15 focus:border-forest-500 focus:outline-none focus:ring-0 focus:bg-white font-sans transition-all appearance-none cursor-pointer"
                      required
                    >
                      {volunteer.interests && volunteer.interests.map((interest, idx) => (
                        <option key={idx} value={interest}>{interest}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-charcoal/50 text-xs font-sans uppercase font-bold tracking-wider">
                      Select Area
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <FormField
                    label="Why do you want to volunteer with Lakshya? (Short Statement)"
                    id="vol_message"
                    name="message"
                    value={volunteerForm.message}
                    onChange={handleInputChange}
                    textarea
                    required
                    shouldReduceMotion={shouldReduceMotion}
                  />
                </div>

                <div className="text-center pt-2">
                  <Button
                    id="volunteer_submit_btn"
                    type="submit"
                    variant="filled"
                    color="forest"
                    disabled={isVolunteering}
                    className="w-full sm:w-auto px-8"
                  >
                    {isVolunteering ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2 inline-block shrink-0" />
                    )}
                    {volunteer.buttonText || 'Submit Application'}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Career;
