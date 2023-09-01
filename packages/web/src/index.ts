export type AptabaseOptions = {
  host?: string;
  appVersion?: string;
};

const locale = getBrowserLocale();
const isDebug = getIsDebug();

let _appKey = '';
let _apiUrl = '';
let _options: AptabaseOptions | undefined;

const _hosts: { [region: string]: string } = {
  US: 'https://us.aptabase.com',
  EU: 'https://eu.aptabase.com',
  DEV: 'http://localhost:3000',
  SH: '',
};

export function init(appKey: string, options?: AptabaseOptions) {
  _appKey = appKey;
  _options = options;

  const parts = appKey.split('-');
  if (parts.length !== 3 || _hosts[parts[1]] === undefined) {
    console.warn(`The Aptabase App Key "${appKey}" is invalid. Tracking will be disabled.`);
    return;
  }

  const baseUrl = getBaseUrl(parts[1], options);
  _apiUrl = `${baseUrl}/api/v0/event`;
}

export async function trackEvent(eventName: string, props?: Record<string, string | number | boolean>): Promise<void> {
  if (!_appKey) return;

  if (typeof window === 'undefined' || !window.fetch) {
    console.warn(
      `Aptabase: this call to "trackEvent" requires a browser environment. Did you import from the wrong package?`,
    );
    return;
  }

  try {
    const response = await window.fetch(_apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'App-Key': _appKey,
      },
      credentials: 'omit',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionId: 'CHANGE-THIS',
        eventName: eventName,
        systemProps: {
          isDebug,
          locale,
          appVersion: _options?.appVersion ?? '',
          sdkVersion: globalThis.__APTABASE_SDK_VERSION__ ?? `aptabase-web@${process.env.PKG_VERSION}`,
        },
        props: props,
      }),
    });

    if (response.status >= 300) {
      const responseBody = await response.text();
      console.warn(`Failed to send event "${eventName}": ${response.status} ${responseBody}`);
    }
  } catch (e) {
    console.warn(`Failed to send event "${eventName}": ${e}`);
  }
}

function getBaseUrl(region: string, options?: AptabaseOptions): string | undefined {
  if (region === 'SH') {
    if (!options?.host) {
      console.warn(`Host parameter must be defined when using Self-Hosted App Key. Tracking will be disabled.`);
      return;
    }
    return options.host;
  }

  return _hosts[region];
}

function getBrowserLocale(): string | null {
  if (typeof navigator === 'undefined') {
    return null;
  }

  if (navigator.languages.length > 0) {
    return navigator.languages[0];
  }

  return navigator.language;
}

function getIsDebug(): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  if (typeof location === 'undefined') {
    return false;
  }

  return location.hostname === 'localhost';
}
