import { WebsiteProjectConfig } from '../config/project-config.types';

export type DomainDecision = {
  allowed: boolean;
  reason: string;
};

export function evaluateTargetURL(target: string, config: WebsiteProjectConfig): DomainDecision {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return { allowed: false, reason: 'Target is not a valid absolute URL.' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { allowed: false, reason: `Protocol ${url.protocol} is not allowed.` };
  }

  const allowedDomain = config.allowedDomains.some((domain) => {
    const normalized = domain.toLowerCase();
    return url.hostname.toLowerCase() === normalized;
  });
  if (!allowedDomain) return { allowed: false, reason: `${url.hostname} is outside the approved domain list.` };

  if (config.excludedPages.some((pagePath) => pathMatches(url.pathname, pagePath))) {
    return { allowed: false, reason: `${url.pathname} is explicitly excluded from scope.` };
  }

  const included = config.includedPages.some((pagePath) => pathMatches(url.pathname, pagePath));
  if (!included) return { allowed: false, reason: `${url.pathname} is not included in the approved page scope.` };

  return { allowed: true, reason: 'URL is within the approved domain and page scope.' };
}

function pathMatches(pathname: string, configuredPath: string): boolean {
  if (configuredPath === '/') return pathname === '/';
  return pathname === configuredPath || pathname.startsWith(`${configuredPath}/`);
}

