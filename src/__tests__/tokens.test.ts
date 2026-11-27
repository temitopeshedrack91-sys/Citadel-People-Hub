import { describe, it, expect } from 'vitest';
import { themeTokens } from '../theme/tokens';
import { CITADEL_BRAND } from '../theme/branding';

describe('Design Tokens System', () => {
  it('defines the Royal Blue primary action color (#174EA6)', () => {
    expect(themeTokens.colors.primary.DEFAULT).toBe('#174EA6');
    expect(CITADEL_BRAND.colors.primary).toBe('#174EA6');
  });

  it('defines restrained semantic status colors within the White, Gold, Black, and Blue palette', () => {
    // Royal Blue positive/in-progress/confirmed
    expect(themeTokens.colors.status.success.bg).toBe('#EFF6FF');
    expect(themeTokens.colors.status.success.text).toBe('#174EA6');

    // Premium Gold pending
    expect(themeTokens.colors.status.warning.bg).toBe('#FAF5EB');
    expect(themeTokens.colors.status.warning.text).toBe('#B88A24');

    // Charcoal Black rejected/negative
    expect(themeTokens.colors.status.error.bg).toBe('#F5F7FA');
    expect(themeTokens.colors.status.error.text).toBe('#111827');
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
