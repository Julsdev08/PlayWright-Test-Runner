import { ConsoleMessage, Page, Request, Response } from '@playwright/test';

export type ConsoleRecord = {
  type: string;
  text: string;
  location: string;
};

export type NetworkRecord = {
  url: string;
  status?: number;
  method?: string;
  error?: string;
};

export type MonitorState = {
  consoleErrors: ConsoleRecord[];
  networkErrors: NetworkRecord[];
  stop: () => void;
};

export function attachBrowserMonitors(page: Page): MonitorState {
  const consoleErrors: ConsoleRecord[] = [];
  const networkErrors: NetworkRecord[] = [];

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      consoleErrors.push({
        type: message.type(),
        text: message.text(),
        location: JSON.stringify(message.location())
      });
    }
  };

  const onPageError = (error: Error) => {
    consoleErrors.push({ type: 'pageerror', text: error.message, location: 'window' });
  };

  const onResponse = (response: Response) => {
    const status = response.status();
    if (status >= 400) {
      networkErrors.push({
        url: response.url(),
        status,
        method: response.request().method()
      });
    }
  };

  const onRequestFailed = (request: Request) => {
    networkErrors.push({
      url: request.url(),
      method: request.method(),
      error: request.failure()?.errorText
    });
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);
  page.on('requestfailed', onRequestFailed);

  return {
    consoleErrors,
    networkErrors,
    stop: () => {
      page.off('console', onConsole);
      page.off('pageerror', onPageError);
      page.off('response', onResponse);
      page.off('requestfailed', onRequestFailed);
    }
  };
}
