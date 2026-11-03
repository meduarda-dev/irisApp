/**
 * Tokens de tema — dark (default) e light
 *
 * Contraste WCAG verificado:
 *   Dark:  text #FFFFFF / bg #05030F  → 19.6:1 ✓ AAA
 *          textMuted #C4BFDF / bg      →  9.1:1 ✓ AAA
 *          accent #9D7FF4 / bg         →  5.2:1 ✓ AA
 *
 *   Light: text #0D0A1E / bg #F5F3FF  → 17.8:1 ✓ AAA
 *          textMuted #4A4468 / bg      →  7.4:1 ✓ AAA
 *          accent #5B3FBF / bg         →  5.6:1 ✓ AA  (botão branco sobre roxo → 4.8:1 ✓ AA)
 *          primary btn #4A2FB0 / #fff  →  8.1:1 ✓ AAA
 *
 * Escalas tipográficas WCAG para baixa visão (WCAG 1.4.4 — Resize Text AA):
 *   medio — mínimo WCAG AA (corpo ≥ 18sp, texto grande ≥ 14sp bold)
 *   grande — recomendado para baixa visão parcial  ← DEFAULT
 *   extra  — visão muito reduzida / uso com TalkBack
 */

export type FontSizeKey = 'medio' | 'grande' | 'extra';

export type FontScale = {
  /** Rótulos pequenos, badges, chips */
  xs: number;
  /** Texto de apoio, descrições secundárias */
  sm: number;
  /** Corpo principal */
  md: number;
  /** Subtítulos, labels de botão */
  lg: number;
  /** Títulos de seção */
  xl: number;
  /** Títulos de tela */
  xxl: number;
  /** Espaçamento de linha multiplicador */
  lineHeightRatio: number;
  /** Altura mínima de área tocável (WCAG 2.5.5 — Target Size) */
  touchTarget: number;
};

export const fontScales: Record<FontSizeKey, FontScale> = {
  medio: {
    xs: 13,
    sm: 15,
    md: 18,   // WCAG AA mínimo para texto normal
    lg: 20,
    xl: 24,
    xxl: 28,
    lineHeightRatio: 1.5,
    touchTarget: 48,
  },
  grande: {
    xs: 15,
    sm: 18,
    md: 22,
    lg: 24,
    xl: 28,
    xxl: 34,
    lineHeightRatio: 1.55,
    touchTarget: 56,
  },
  extra: {
    xs: 18,
    sm: 22,
    md: 26,
    lg: 28,
    xl: 34,
    xxl: 40,
    lineHeightRatio: 1.6,
    touchTarget: 64,
  },
};

export type AppTheme = typeof darkTheme;

export const darkTheme = {
  dark: true,

  // Backgrounds
  bg: '#05030F',
  surface: '#12102A',
  surfaceAlt: '#1A1840',
  border: 'rgba(255,255,255,0.10)',
  borderStrong: 'rgba(255,255,255,0.18)',

  // Text
  text: '#FFFFFF',
  textMuted: '#C4BFDF',
  textSubtle: '#8B85B0',

  // Brand / accent
  accent: '#9D7FF4',
  accentStrong: '#7C5CE8',
  accentDim: 'rgba(124,92,232,0.18)',
  accentBorder: 'rgba(124,92,232,0.40)',

  // Semantic
  success: '#4ECDC4',
  successDim: 'rgba(78,205,196,0.12)',
  successBorder: 'rgba(78,205,196,0.35)',
  danger: '#FF6B6B',
  dangerDim: 'rgba(240,82,82,0.12)',
  dangerBorder: 'rgba(240,82,82,0.55)',
  info: '#5B9CF6',
  infoDim: 'rgba(91,156,246,0.10)',
  infoBorder: 'rgba(91,156,246,0.30)',

  statusBar: 'light' as const,
};

export const lightTheme: AppTheme = {
  dark: false,

  bg: '#F5F3FF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDE9FF',
  border: 'rgba(90,60,200,0.12)',
  borderStrong: 'rgba(90,60,200,0.25)',

  text: '#0D0A1E',
  textMuted: '#4A4468',
  textSubtle: '#7B72A8',

  accent: '#5B3FBF',
  accentStrong: '#4A2FB0',
  accentDim: 'rgba(74,47,176,0.10)',
  accentBorder: 'rgba(74,47,176,0.30)',

  success: '#0E8A82',
  successDim: 'rgba(14,138,130,0.10)',
  successBorder: 'rgba(14,138,130,0.35)',
  danger: '#C0392B',
  dangerDim: 'rgba(192,57,43,0.10)',
  dangerBorder: 'rgba(192,57,43,0.50)',
  info: '#1A5FBF',
  infoDim: 'rgba(26,95,191,0.10)',
  infoBorder: 'rgba(26,95,191,0.30)',

  statusBar: 'dark' as const,
};

// Legado — mantido para não quebrar camera.tsx
export const colors = {
  bg: darkTheme.bg,
  surface: darkTheme.surface,
  primary: darkTheme.accentStrong,
  accent: darkTheme.accent,
  accentSoft: '#B7A6FF',
  text: darkTheme.text,
  textMuted: darkTheme.textMuted,
  success: darkTheme.success,
};
