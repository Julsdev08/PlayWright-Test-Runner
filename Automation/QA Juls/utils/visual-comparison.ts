import fs from 'fs';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { Page } from '@playwright/test';
import { visualComparison } from '../config/test.config';

export type VisualComparisonResult = {
  skipped: boolean;
  diffPixels: number;
  diffRatio: number;
  actualPath: string;
  diffPath: string;
  reason?: string;
};

export async function comparePageToReference(
  page: Page,
  referencePath: string | undefined,
  pageName: string,
  viewportName: string
): Promise<VisualComparisonResult> {
  const safePageName = pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const actualPath = path.resolve('reports/visual', `${safePageName}-${viewportName}-actual.png`);
  const diffPath = path.resolve('reports/visual', `${safePageName}-${viewportName}-diff.png`);
  fs.mkdirSync(path.dirname(actualPath), { recursive: true });

  await page.screenshot({ path: actualPath, fullPage: true, animations: 'disabled' });

  if (!referencePath || !fs.existsSync(referencePath)) {
    return {
      skipped: true,
      diffPixels: 0,
      diffRatio: 0,
      actualPath,
      diffPath,
      reason: `Reference image not found: ${referencePath ?? 'not configured'}`
    };
  }

  const actual = PNG.sync.read(fs.readFileSync(actualPath));
  const expected = PNG.sync.read(fs.readFileSync(referencePath));

  const width = Math.min(actual.width, expected.width);
  const height = Math.min(actual.height, expected.height);
  const diff = new PNG({ width, height });
  const croppedExpected = cropPng(expected, width, height);
  const croppedActual = cropPng(actual, width, height);

  const diffPixels = pixelmatch(
    croppedExpected.data,
    croppedActual.data,
    diff.data,
    width,
    height,
    { threshold: visualComparison.threshold }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return {
    skipped: false,
    diffPixels: diffPixels + Math.abs(actual.width * actual.height - expected.width * expected.height),
    diffRatio: diffPixels / (width * height),
    actualPath,
    diffPath,
    reason:
      actual.width !== expected.width || actual.height !== expected.height
        ? `Screenshot size ${actual.width}x${actual.height} differs from reference ${expected.width}x${expected.height}; compared overlapping ${width}x${height} area.`
        : undefined
  };
}

function cropPng(source: PNG, width: number, height: number): PNG {
  if (source.width === width && source.height === height) {
    return source;
  }

  const cropped = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceStart = (source.width * y) << 2;
    const sourceEnd = sourceStart + (width << 2);
    const targetStart = (width * y) << 2;
    source.data.copy(cropped.data, targetStart, sourceStart, sourceEnd);
  }

  return cropped;
}
