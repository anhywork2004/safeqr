// ============================================
// SafeQR v2 — Contacts Data Hook
// ============================================
import { useState, useEffect, useCallback } from "react";
import type { EmergencyContact, ContactOverride, SiteConfig } from "@/types";
import { DEFAULT_CONTACTS } from "@/data/contacts";
import { DEFAULT_CONFIG } from "@/data/site-config";
import { fetchContacts, fetchConfig } from "@/lib/api";
import { getItem } from "@/lib/storage";
import { STORAGE_KEYS } from "@/lib/constants";

interface UseContactsReturn {
  contacts: EmergencyContact[];
  config: SiteConfig;
  loading: boolean;
  isOffline: boolean;
  refresh: () => void;
}

export function useContacts(): UseContactsReturn {
  const [contacts, setContacts] = useState<EmergencyContact[]>(DEFAULT_CONTACTS);
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    let offline = true;

    // 1. Start with hardcoded defaults (always available)
    let mergedContacts = [...DEFAULT_CONTACTS];
    let mergedConfig = { ...DEFAULT_CONFIG };

    // 2. Try API
    const [apiContacts, apiConfig] = await Promise.all([
      fetchContacts(),
      fetchConfig(),
    ]);

    if (apiContacts) {
      offline = false;
      mergedContacts = apiContacts;
    }
    if (apiConfig) {
      offline = false;
      mergedConfig = apiConfig;
    }

    // 3. Apply localStorage overrides
    const localOverrides = getItem<Record<string, ContactOverride>>(
      STORAGE_KEYS.CONTACTS,
      {}
    );

    mergedContacts = mergedContacts.map((c) => {
      const override = localOverrides[c.id];
      if (override) {
        return {
          ...c,
          phone: override.phone ?? c.phone,
          address: override.address ?? c.address,
          mapsQuery: override.mapsQuery ?? c.mapsQuery,
          description: override.description ?? c.description,
        };
      }
      return c;
    });

    setContacts(mergedContacts);
    setConfig(mergedConfig);
    setIsOffline(offline);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { contacts, config, loading, isOffline, refresh: loadData };
}
