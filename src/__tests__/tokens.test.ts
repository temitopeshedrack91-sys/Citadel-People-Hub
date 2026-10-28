import { describe, it, expect } from 'vitest';
import { themeTokens } from '../theme/tokens';
import { CITADEL_BRAND } from '../theme/branding';

describe('Design Tokens System', () => {
  it('defines the dark forest green primary action color (#083E34)', () => {
    expect(themeTokens.colors.primary.DEFAULT).toBe('#083E34');
    expect(CITADEL_BRAND.colors.primary).toBe('#083E34');
  });

  it('defines restrained semantic status colors matching the reference specifications', () => {
    // Light green positive/in-progress/confirmed
    expect(themeTokens.colors.status.success.bg).toBe('#ECFDF5');
    expect(themeTokens.colors.status.success.text).toBe('#059669');

    // Yellow/amber pending
    expect(themeTokens.colors.status.warning.bg).toBe('#FFFBEB');
    expect(themeTokens.colors.status.warning.text).toBe('#D97706');

    // Red rejected/negative
    expect(themeTokens.colors.status.error.bg).toBe('#FEF2F2');
    expect(themeTokens.colors.status.error.text).toBe('#DC2626');
  });

  it('defines rounded corner tokens (card: 20px / 1.25rem, button: 12px / 0.75rem, pill: 9999px)', () => {
    expect(themeTokens.radii.card).toBe('1.25rem');
    expect(themeTokens.radii.button).toBe('0.75rem');
    expect(themeTokens.radii.pill).toBe('9999px');
  });

  it('defines soft shadow tokens for separation', () => {
    expect(themeTokens.shadows.card).toContain('rgba(15, 23, 42');
    expect(themeTokens.shadows.cardHover).toBeDefined();
  });
});
