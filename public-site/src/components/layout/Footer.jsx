import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import Button from '../ui/Button';
import logoImg from '../../assets/lakshya.png';
import { useCMSData } from '../../hooks/useCMSData';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const settings = useCMSData('settings');
  const contact = useCMSData('contact');

  const [subscribed, setSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  const handleSubscribe = async (e) => {
    e.preventDefault();

    const service = contact?.formSettings?.emailService || 'demo';
    const subject = `Newsletter Subscription Request`;

    try {
      // Save subscriber to local backend database
      try {
        await fetch('/api/newsletter/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: emailInput }),
        });
      } catch (dbErr) {
        console.error('Local newsletter DB save error:', dbErr);
      }

      if (service === 'web3forms' && contact?.formSettings?.web3formsKey) {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            access_key: contact.formSettings.web3formsKey,
            email: emailInput,
            subject: subject,
            message: `A visitor has subscribed to the newsletter: ${emailInput}`,
            from_name: 'Lakshya NGO Public Site',
          }),
        });
      } else if (service === 'formspree' && contact?.formSettings?.formspreeFormId) {
        await fetch(`https://formspree.io/f/${contact.formSettings.formspreeFormId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            email: emailInput,
            subject: subject,
            message: `A visitor has subscribed to the newsletter: ${emailInput}`,
          }),
        });
      } else if (service === 'emailjs' && contact?.formSettings?.emailjsServiceId) {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            service_id: contact.formSettings.emailjsServiceId,
            template_id: contact.formSettings.emailjsTemplateId,
            user_id: contact.formSettings.emailjsPublicKey,
            template_params: {
              from_name: 'Newsletter Subscriber',
              reply_to: emailInput,
              subject: subject,
              message: `A visitor has subscribed to the newsletter: ${emailInput}`,
            },
          }),
        });
      } else if (service === 'webhook' && contact?.formSettings?.webhookUrl) {
        await fetch(contact.formSettings.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailInput,
            type: 'newsletter',
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } catch (err) {
      console.error('Newsletter subscription dispatch failed:', err);
      return; // Don't mark as subscribed on failure
    }

    setSubscribed(true);
  };

  const navItems = settings?.navigation || [
    { id: "n1", name: "About Us", path: "/about", active: true },
    { id: "n2", name: "Our Programmes", path: "/programmes", active: true },
    { id: "n3", name: "Media Gallery", path: "/gallery", active: true },
    { id: "n4", name: "Contact Us", path: "/contact", active: true },
    { id: "n5", name: "Support Our Cause", path: "/donate", active: true }
  ];

  return (
    <footer className="bg-charcoal text-white pt-16 pb-8 border-t-4 border-forest-500">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* About Section */}
        <div className="space-y-4">
          <Link to="/" className="flex items-center space-x-2">
            <img
              src={settings?.general?.logoLight || logoImg}
              onError={(e) => { if (e.target.src !== logoImg) e.target.src = logoImg; }}
              alt={`${settings?.general?.siteName || 'Lakshya'} Logo`}
              className="w-6 h-6 object-contain"
            />
            <span className="font-display font-bold text-xl text-white tracking-wide">
              {settings?.general?.siteName || 'Lakshya'}
            </span>
          </Link>
          <p className="text-cream/70 text-sm leading-relaxed">
            {settings?.general?.tagline || 'Lakshya - A Society for Social and Environmental Development. Born in 2006, working at the intersection of community empowerment and environmental preservation.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {settings?.social?.facebook && (
              <a href={settings.social.facebook} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-white/10 border border-white/15 hover:border-white/30 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300" aria-label="Facebook">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
            )}
            {settings?.social?.twitter && (
              <a href={settings.social.twitter} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-white/10 border border-white/15 hover:border-white/30 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300" aria-label="Twitter">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            )}
            {settings?.social?.instagram && (
              <a href={settings.social.instagram} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-white/10 border border-white/15 hover:border-white/30 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300" aria-label="Instagram">
                <svg className="w-5 h-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
            )}
            {settings?.social?.youtube && (
              <a href={settings.social.youtube} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-white/10 border border-white/15 hover:border-white/30 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300" aria-label="YouTube">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.388.511a3.002 3.002 0 0 0-2.11 2.107C0 8.021 0 12 0 12s0 3.979.502 5.837a3.002 3.002 0 0 0 2.11 2.107C4.495 20.455 12 20.455 12 20.455s7.505 0 9.388-.511a3.002 3.002 0 0 0 2.11-2.107C24 15.979 24 12 24 12s0-3.979-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            )}
            {settings?.social?.linkedin && (
              <a href={settings.social.linkedin} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-full bg-white/10 border border-white/15 hover:border-white/30 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300" aria-label="LinkedIn">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                </svg>
              </a>
            )}
            {settings?.social?.whatsapp && (
              <a
                href={`https://wa.me/${settings.social.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-white/10 border border-white/15 hover:border-white/30 text-white/80 hover:text-white hover:bg-white/20 transition-all duration-300"
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.8.983 3.834 1.502 5.913 1.503h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-lg text-amber-400">Quick Links</h3>
          <ul className="space-y-2">
            {navItems.filter(item => item.active).map((item) => (
              <li key={item.id}>
                <Link to={item.path} className="text-cream/70 text-sm hover:text-forest-400 transition-colors">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-lg text-amber-400">Get in Touch</h3>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3 text-sm text-cream/70">
              <MapPin className="w-5 h-5 text-forest-400 shrink-0 mt-0.5" />
              <span>
                {contact?.headOffice?.address1 || '12, Sector 8'}, {contact?.headOffice?.address2 || 'Vikas Nagar'},
                <br />
                {contact?.headOffice?.cityStatePin || 'Lucknow, Uttar Pradesh - 226022'}
              </span>
            </li>
            <li className="flex items-center space-x-3 text-sm text-cream/70">
              <Mail className="w-5 h-5 text-forest-400 shrink-0" />
              <span>{contact?.headOffice?.email || 'info@lakshyafordevelopment.org'}</span>
            </li>
          </ul>
        </div>

        {/* Newsletter Section */}
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-lg text-amber-400">Newsletter</h3>
          <p className="text-cream/70 text-sm">
            Stay updated with our latest updates, campaigns, and impact stories.
          </p>
          {subscribed ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center space-y-2">
              <div className="w-10 h-10 bg-forest-500/20 text-forest-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-forest-500/20">
                <svg className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-semibold text-sm text-amber-400">Subscribed!</h4>
                <p className="text-[11px] text-cream/70 leading-relaxed font-sans">
                  Thank you for joining our newsletter list.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col space-y-2">
              <input
                type="email"
                placeholder="Your email address"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="bg-white/10 border border-white/15 rounded-full px-4 py-2.5 text-sm text-white placeholder-cream/40 focus:outline-none focus:bg-white/15 focus:ring-2 focus:ring-forest-500 focus:border-forest-500 transition-all"
              />
              <Button variant="filled" color="forest" type="submit" className="py-2.5 text-sm shadow-md">
                Subscribe
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-xs text-cream/40 space-y-4 md:space-y-0">
        <p>{settings?.general?.footerCopyright || `© ${currentYear} Lakshya NGO. All rights reserved.`}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center md:justify-end">
          <Link to="/privacy-policy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link>
          <Link to="/terms-conditions" className="hover:text-amber-400 transition-colors">Terms &amp; Conditions</Link>
          <Link to="/refund-policy" className="hover:text-amber-400 transition-colors">Refund Policy</Link>
          <Link to="/cancellation-policy" className="hover:text-amber-400 transition-colors">Cancellation Policy</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
