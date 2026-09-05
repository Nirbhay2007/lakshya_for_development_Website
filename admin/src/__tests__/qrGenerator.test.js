import { describe, it, expect } from 'vitest';

describe('Local QR Code & Deep Link Composer', () => {
  const composeCampaignUrl = (baseUrl, causeId) => {
    const cleanBase = baseUrl.replace(/\/+$/, '');
    const cleanId = encodeURIComponent((causeId || '').trim());
    return `${cleanBase}/donate?cause=${cleanId}`;
  };

  const parseQueryCause = (searchQuery) => {
    const params = new URLSearchParams(searchQuery);
    return params.get('cause') || params.get('preset') || params.get('id') || '';
  };

  it('composes campaign deep links cleanly with permanent poster IDs', () => {
    expect(composeCampaignUrl('https://lakshya.buildpod.tech', 'p1')).toBe('https://lakshya.buildpod.tech/donate?cause=p1');
    expect(composeCampaignUrl('https://lakshya.buildpod.tech/', 'cause-456')).toBe('https://lakshya.buildpod.tech/donate?cause=cause-456');
  });

  it('parses cause, preset, or id URL parameters accurately', () => {
    expect(parseQueryCause('?cause=p1')).toBe('p1');
    expect(parseQueryCause('?preset=p2')).toBe('p2');
    expect(parseQueryCause('?id=cause-999')).toBe('cause-999');
    expect(parseQueryCause('?other=abc')).toBe('');
  });

  it('encodes special characters in campaign names safely', () => {
    const rawUrl = composeCampaignUrl('https://lakshya.buildpod.tech', 'Adhaar & Vaidehi');
    expect(rawUrl).toBe('https://lakshya.buildpod.tech/donate?cause=Adhaar%20%26%20Vaidehi');
  });
});
