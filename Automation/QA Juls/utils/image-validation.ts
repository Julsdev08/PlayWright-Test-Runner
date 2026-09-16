import { Page } from '@playwright/test';
import { IssueTracker } from './issue-tracker';

type Context = {
  pageName: string;
  url: string;
  viewport: string;
  browser: string;
};

export async function runImageValidation(page: Page, tracker: IssueTracker, context: Context): Promise<void> {
  const images = await page.evaluate(() => {
    return [...document.images].map((image) => {
      const rect = image.getBoundingClientRect();
      const renderedRatio = rect.width && rect.height ? rect.width / rect.height : 0;
      const naturalRatio = image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : 0;
      return {
        src: image.currentSrc || image.src,
        alt: image.getAttribute('alt'),
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        renderedWidth: rect.width,
        renderedHeight: rect.height,
        ratioDelta: renderedRatio && naturalRatio ? Math.abs(renderedRatio - naturalRatio) : 0
      };
    });
  });

  for (const image of images) {
    if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
      tracker.add({
        ...baseIssue(context, image.src),
        severity: 'Critical',
        issueSummary: 'Broken or missing image',
        actualResult: `Image failed to load: ${image.src}`,
        expectedResult: 'Image should load successfully with valid intrinsic dimensions.'
      });
      continue;
    }

    if (image.renderedWidth > image.naturalWidth * 1.5 || image.renderedHeight > image.naturalHeight * 1.5) {
      tracker.add({
        ...baseIssue(context, image.src),
        severity: 'Medium',
        issueSummary: 'Image may appear pixelated',
        actualResult: `Rendered at ${Math.round(image.renderedWidth)}x${Math.round(image.renderedHeight)} from ${image.naturalWidth}x${image.naturalHeight}.`,
        expectedResult: 'Images should not be scaled far beyond their intrinsic size.'
      });
    }

    if (image.ratioDelta > 0.15) {
      tracker.add({
        ...baseIssue(context, image.src),
        severity: 'Medium',
        issueSummary: 'Image aspect ratio appears inconsistent',
        actualResult: `Rendered aspect ratio differs from natural image ratio by ${image.ratioDelta.toFixed(2)}.`,
        expectedResult: 'Image aspect ratio should remain visually consistent unless intentional cropping is applied.'
      });
    }
  }

  if (images.length === 0) {
    tracker.pass(context.pageName);
  }
}

function baseIssue(context: Context, src: string) {
  return {
    page: context.pageName,
    url: context.url,
    area: 'Images',
    component: src,
    viewport: context.viewport,
    browser: context.browser,
    testType: 'Image' as const,
    status: 'Failed' as const,
    stepsToReproduce: `Open ${context.url} at ${context.viewport} and inspect image ${src}.`
  };
}
