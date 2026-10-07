export function normalizeData(section, rawData) {
  if (!rawData) return rawData;
  if (section === 'gallery') {
    if (rawData.images && Array.isArray(rawData.images)) {
      const normalizedImages = rawData.images.map((img) => {
        if (img.url && !img.image) {
          return { ...img, image: img.url };
        }
        if (img.image && !img.url) {
          return { ...img, url: img.image };
        }
        return img;
      });
      return { ...rawData, images: normalizedImages };
    }
  }
  if (section === 'partners') {
    const normalized = { ...rawData };
    if (!normalized.rows) {
      const oldPartners = normalized.partners || (Array.isArray(rawData) ? rawData : []);
      const row1Partners = oldPartners.filter(p => p.row == 1 || !p.row);
      const row2Partners = oldPartners.filter(p => p.row == 2);
      
      normalized.rows = [
        {
          id: 'row_1',
          heading: 'Our Sponsors & Partners',
          partners: row1Partners.map((p, idx) => ({
            id: p.id || `p_${Date.now()}_1_${idx}`,
            logo: p.logo || p.image || '',
            active: p.active !== false
          }))
        },
        {
          id: 'row_2',
          heading: 'Institutional Collaborators',
          partners: row2Partners.map((p, idx) => ({
            id: p.id || `p_${Date.now()}_2_${idx}`,
            logo: p.logo || p.image || '',
            active: p.active !== false
          }))
        }
      ];
      delete normalized.partners;
    }
    
    normalized.rows = normalized.rows.map((row, idx) => ({
      id: row.id || `row_${Date.now()}_${idx}`,
      heading: row.heading !== undefined ? row.heading : `Partner Row ${idx + 1}`,
      partners: Array.isArray(row.partners) ? row.partners.map((p, pIdx) => ({
        id: p.id || `p_${Date.now()}_${idx}_${pIdx}`,
        logo: p.logo || '',
        active: p.active !== false
      })) : []
    }));
    
    if (!normalized.settings) normalized.settings = { speed: 'medium' };
    return normalized;
  }
  if (section === 'impact') {
    if (rawData.stats && Array.isArray(rawData.stats)) {
      const normalizedStats = rawData.stats.map((item) => {
        const num = item.number !== undefined ? item.number : (item.value !== undefined ? item.value : '0');
        const val = num;
        const icon = item.icon !== undefined ? item.icon : (item.iconName !== undefined ? item.iconName : 'Heart');
        const iconName = icon;
        
        let labelLine1 = item.labelLine1 !== undefined ? item.labelLine1 : '';
        let labelLine2 = item.labelLine2 !== undefined ? item.labelLine2 : '';
        if (item.label && !item.labelLine1 && !item.labelLine2) {
          const parts = item.label.split(' ');
          labelLine1 = parts[0] || '';
          labelLine2 = parts.slice(1).join(' ') || '';
        }
        const label = item.label !== undefined ? item.label : [labelLine1, labelLine2].filter(Boolean).join(' ');

        return {
          ...item,
          number: num,
          value: val,
          icon: icon,
          iconName: iconName,
          labelLine1: labelLine1,
          labelLine2: labelLine2,
          label: label
        };
      });
      return { ...rawData, stats: normalizedStats };
    }
  }
  if (section === 'events') {
    const normalized = { ...rawData };
    if (!normalized.settings) {
      normalized.settings = {};
    }
    const speed = normalized.speed !== undefined ? normalized.speed : (normalized.settings.speed !== undefined ? normalized.settings.speed : 'medium');
    normalized.speed = speed;
    normalized.settings.speed = speed;

    const bgColor = normalized.bgColor !== undefined ? normalized.bgColor : (normalized.settings.bgColor !== undefined ? normalized.settings.bgColor : '#2e7d32');
    normalized.bgColor = bgColor;
    normalized.settings.bgColor = bgColor;

    const textColor = normalized.textColor !== undefined ? normalized.textColor : (normalized.settings.textColor !== undefined ? normalized.settings.textColor : '#ffffff');
    normalized.textColor = textColor;
    normalized.settings.textColor = textColor;

    return normalized;
  }
  if (section === 'careers') {
    const normalized = { ...rawData };
    if (!normalized.hero) normalized.hero = { title: '', subtitle: '', bgImage: '' };
    if (!normalized.intro) normalized.intro = { title: '', description: '' };
    if (!Array.isArray(normalized.jobs)) normalized.jobs = [];
    if (!normalized.volunteer) {
      normalized.volunteer = {
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
    }
    return normalized;
  }
  if (section === 'contact') {
    const normalized = { ...rawData };
    if (!normalized.formSettings) normalized.formSettings = {};
    const fs = normalized.formSettings;
    if (fs.smtpSecure === undefined) fs.smtpSecure = true;
    if (!fs.smtpHost) fs.smtpHost = '';
    if (!fs.smtpPort) fs.smtpPort = '465';
    if (!fs.smtpUser) fs.smtpUser = '';
    if (!fs.smtpPass) fs.smtpPass = '';
    if (!fs.candidateSubject) fs.candidateSubject = 'Application Received: [Job Title]';
    if (!fs.candidateBody) {
      fs.candidateBody = 'Dear [Name],\n\nThank you for applying for the position of [Job Title] at Lakshya NGO.\n\nWe have successfully received your application. Our recruitment team will review your qualifications and contact you if your profile matches our requirements.\n\nBest regards,\nRecruitment Team\nLakshya NGO';
    }
    if (!fs.enquirySubject) fs.enquirySubject = 'Thank you for contacting Lakshya NGO';
    if (!fs.enquiryBody) {
      fs.enquiryBody = 'Dear [Name],\n\nThank you for reaching out to us. We have received your message regarding: [Subject].\n\nOur team will review your enquiry and get back to you as soon as possible.\n\nBest regards,\nLakshya NGO';
    }
    if (!fs.newsletterSubject) fs.newsletterSubject = 'Welcome to Lakshya NGO Newsletter!';
    if (!fs.newsletterBody) {
      fs.newsletterBody = 'Dear Subscriber,\n\nThank you for subscribing to our newsletter!\n\nYou will now receive regular updates about our tree plantation drives, education campaigns, and impact stories.\n\nBest regards,\nLakshya NGO';
    }
    return normalized;
  }
  if (section === 'legal') {
    const normalized = { ...rawData };
    if (!normalized.privacyPolicy) {
      normalized.privacyPolicy = { title: 'Privacy Policy', lastUpdated: '', content: '' };
    }
    if (!normalized.termsConditions) {
      normalized.termsConditions = { title: 'Terms & Conditions', lastUpdated: '', content: '' };
    }
    if (!normalized.refundPolicy) {
      normalized.refundPolicy = { title: 'Refund & Return Policy', lastUpdated: '', content: '' };
    }
    if (!normalized.cancellationPolicy) {
      normalized.cancellationPolicy = { title: 'Cancellation Policy', lastUpdated: '', content: '' };
    }
    return normalized;
  }
  if (section === 'team') {
    let list = rawData;
    if (rawData && !Array.isArray(rawData)) {
      if (Array.isArray(rawData.members)) list = rawData.members;
      else if (Array.isArray(rawData.team)) list = rawData.team;
      else list = [];
    }
    if (!Array.isArray(list)) list = [];
    return list.map((m) => ({ ...m, active: m.active !== false }));
  }
  if (section === 'programmes') {
    let list = rawData;
    if (rawData && !Array.isArray(rawData)) {
      if (Array.isArray(rawData.items)) list = rawData.items;
      else if (Array.isArray(rawData.programmes)) list = rawData.programmes;
      else list = [];
    }
    if (!Array.isArray(list)) list = [];
    return list.map((p) => ({ ...p, active: p.active !== false }));
  }
  if (section === 'about') {
    const normalized = { ...rawData };
    if (!normalized.main) normalized.main = {};
    if (!normalized.missionVision) normalized.missionVision = {};
    if (!Array.isArray(normalized.timeline)) normalized.timeline = [];
    if (!Array.isArray(normalized.values)) normalized.values = [];
    return normalized;
  }
  if (section === 'hero') {
    let list = rawData;
    if (rawData && !Array.isArray(rawData)) {
      if (Array.isArray(rawData.slides)) list = rawData.slides;
      else if (Array.isArray(rawData.items)) list = rawData.items;
      else list = [];
    }
    if (!Array.isArray(list)) list = [];
    return list.map((s) => ({ ...s, active: s.active !== false }));
  }
  if (section === 'donate') {
    const normalized = { ...rawData };
    if (Array.isArray(normalized.presets)) {
      normalized.presets = normalized.presets.map((p, idx) => ({
        id: p.id || `preset_${Date.now()}_${idx}`,
        title: p.title || (p.amount ? `₹${p.amount}` : 'Donation Cause'),
        label: p.label || p.title || '',
        amount: p.amount !== undefined ? Number(p.amount) : 0,
        icon: p.icon || 'Heart',
        highlighted: p.highlighted === true || p.highlight === true,
        redirectUrl: p.redirectUrl || ''
      }));
    } else {
      normalized.presets = [];
    }
    if (!normalized.gateways) {
      normalized.gateways = {};
    }
    const g = normalized.gateways;
    if (!g.activeGateway) g.activeGateway = 'razorpay';
    if (!g.razorpay) g.razorpay = {};
    if (g.razorpay.enabled === undefined) g.razorpay.enabled = true;
    if (!g.razorpay.keyId) g.razorpay.keyId = '';
    if (!g.razorpay.keySecret) g.razorpay.keySecret = '';
    if (g.razorpay.isTestMode === undefined) g.razorpay.isTestMode = true;

    return normalized;
  }
  return rawData;
}
