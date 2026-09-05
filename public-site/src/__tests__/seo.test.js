import { describe, it, expect } from 'vitest';

describe('SEO Meta & OpenGraph Generator Logic', () => {
  const generatePageTitle = (pageTitle, siteName = 'Lakshya NGO') => {
    if (!pageTitle) return siteName;
    return `${pageTitle} | ${siteName}`;
  };

  const generateCanonicalUrl = (domain, path) => {
    const cleanDomain = domain.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${cleanDomain}${cleanPath}`;
  };

  it('formats page title tags dynamically', () => {
    expect(generatePageTitle('Donate & Support')).toBe('Donate & Support | Lakshya NGO');
    expect(generatePageTitle('About Our Mission')).toBe('About Our Mission | Lakshya NGO');
    expect(generatePageTitle('')).toBe('Lakshya NGO');
  });

  it('generates clean canonical URLs without duplicate slashes', () => {
    expect(generateCanonicalUrl('https://lakshya.buildpod.tech', '/donate')).toBe('https://lakshya.buildpod.tech/donate');
    expect(generateCanonicalUrl('https://lakshya.buildpod.tech/', 'about')).toBe('https://lakshya.buildpod.tech/about');
  });
});
