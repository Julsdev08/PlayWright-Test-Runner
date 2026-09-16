import path from 'path';
import { testEnvironment } from './env';

export type ViewportConfig = {
  name: string;
  width: number;
  height: number;
  category: 'desktop' | 'mobile';
};

export type PageConfig = {
  name: string;
  path: string;
  figmaReference?: string;
  criticalSelectors?: string[];
  smoke?: {
    navLinks?: string[];
    buttons?: string[];
    forms?: string[];
    components?: string[];
  };
};

export const baseUrl = testEnvironment.baseURL ?? '';

export const viewports: ViewportConfig[] = [
  { name: 'desktop-1440', width: 1440, height: 900, category: 'desktop' },
  { name: 'desktop-1920', width: 1920, height: 1080, category: 'desktop' },
  { name: 'mobile-390', width: 390, height: 844, category: 'mobile' },
  { name: 'mobile-430', width: 430, height: 932, category: 'mobile' }
];

export const pages: PageConfig[] = [
  {
    name: 'Home',
    path: '/',
    figmaReference: path.resolve('visual/baselines/home-desktop-1440.png'),
    criticalSelectors: ['header', 'main', 'footer'],
    smoke: {
      navLinks: ['header a', 'footer a'],
      buttons: ['button', 'a[role="button"]', 'input[type="submit"]'],
      forms: ['form'],
      components: [
        '[role="tab"]',
        '[aria-expanded]',
        'select',
        'input[type="checkbox"]',
        'input[type="radio"]',
        '[data-testid*="carousel"]',
        '[data-testid*="modal"]'
      ]
    }
  }
];

export const visualComparison = {
  threshold: Number(process.env.VISUAL_THRESHOLD ?? 0.1),
  maxDiffRatio: Number(process.env.VISUAL_MAX_DIFF_RATIO ?? 0.01)
};

export const performanceBudgets = {
  fcpMs: Number(process.env.PERF_FCP_MS ?? 2500),
  lcpMs: Number(process.env.PERF_LCP_MS ?? 4000),
  cls: Number(process.env.PERF_CLS ?? 0.1),
  loadMs: Number(process.env.PERF_LOAD_MS ?? 5000)
};
