import { useEffect, useState } from 'react';
import { fetchSettings, CompanySettings } from './settings.service';

// Small cache so every component that needs the company name/logo (sidebar,
// future letterheads, etc.) doesn't each fire their own request — Settings
// rarely changes, so a simple module-level cache with manual refresh is
// enough here rather than pulling in a full data-fetching library.
let cached: CompanySettings | null = null;
let inflight: Promise<CompanySettings> | null = null;

export function useCompanyBranding() {
  const [settings, setSettings] = useState<CompanySettings | null>(cached);

  useEffect(() => {
    if (cached) return;
    if (!inflight) inflight = fetchSettings();
    inflight.then((data) => {
      cached = data;
      setSettings(data);
    });
  }, []);

  return settings;
}

export function invalidateCompanyBrandingCache() {
  cached = null;
  inflight = null;
}
