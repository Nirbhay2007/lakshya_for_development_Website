import { describe, it, expect } from 'vitest';
import { normalizeData } from '../normalizeData.js';

describe('Shared CMS Data Normalizer', () => {
  it('unwraps wrapped team members and preserves active flag', () => {
    const wrapped = {
      members: [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob', active: false },
        { id: '3', name: 'Charlie', active: true }
      ]
    };
    const result = normalizeData('team', wrapped);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(result[0].active).toBe(true); // default active !== false
    expect(result[1].active).toBe(false);
    expect(result[2].active).toBe(true);
  });

  it('unwraps wrapped programmes items and preserves active flag', () => {
    const wrapped = {
      items: [
        { id: 'p1', title: 'Adhaar' },
        { id: 'p2', title: 'Vaidehi', active: false }
      ]
    };
    const result = normalizeData('programmes', wrapped);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
    expect(result[0].active).toBe(true);
    expect(result[1].active).toBe(false);
  });

  it('ensures about section has timeline and values arrays', () => {
    const partialAbout = {
      main: { headline: 'Test' },
      missionVision: { missionTitle: 'Mission' }
    };
    const result = normalizeData('about', partialAbout);
    expect(Array.isArray(result.timeline)).toBe(true);
    expect(Array.isArray(result.values)).toBe(true);
    expect(result.timeline.length).toBe(0);
  });

  it('provides complete defaults for legal policies including refund and cancellation', () => {
    const emptyLegal = {};
    const result = normalizeData('legal', emptyLegal);
    expect(result.privacyPolicy).toBeDefined();
    expect(result.termsConditions).toBeDefined();
    expect(result.refundPolicy).toBeDefined();
    expect(result.cancellationPolicy).toBeDefined();
    expect(result.refundPolicy.title).toBe('Refund & Return Policy');
    expect(result.cancellationPolicy.title).toBe('Cancellation Policy');
  });

  it('normalizes hero slides and preserves active flag', () => {
    const rawHero = [
      { title: 'Slide 1', status: 'Active' },
      { title: 'Slide 2', status: 'Hidden', active: false }
    ];
    const result = normalizeData('hero', rawHero);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].active).toBe(true);
    expect(result[1].active).toBe(false);
  });
});
