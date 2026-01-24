/**
 * Settings Context Provider (V-29)
 *
 * Provides centralized settings management across the application.
 * Reduces redundant API calls and prop drilling.
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsApi } from '../services/api';

interface Settings {
  ingest_interval_minutes: number;
  archive_age_days: number;
  archive_time_hour: number;
  posts_per_fetch: number;
  worthiness_threshold: number;
  duplicate_threshold: number;
  enabled_categories: string[];
  scheduler_paused: boolean;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  error: string | null;
  updateSetting: (key: string, value: any) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: Settings = {
  ingest_interval_minutes: 30,
  archive_age_days: 7,
  archive_time_hour: 3,
  posts_per_fetch: 5,
  worthiness_threshold: 0.6,
  duplicate_threshold: 0.85,
  enabled_categories: ['Technology', 'Politics', 'Business', 'Science', 'Health', 'Other'],
  scheduler_paused: false
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await settingsApi.getAll();
      const grouped = response.data;

      // Extract settings from grouped response
      const loadedSettings: Settings = { ...defaultSettings };

      Object.values(grouped).flat().forEach((setting: any) => {
        const key = setting.key;
        let value = setting.value;

        // Type conversion based on value_type
        if (setting.value_type === 'int') {
          value = parseInt(value);
        } else if (setting.value_type === 'float') {
          value = parseFloat(value);
        } else if (setting.value_type === 'bool') {
          value = value === 'true' || value === '1';
        } else if (setting.value_type === 'json') {
          value = JSON.parse(value);
        }

        if (key in loadedSettings) {
          (loadedSettings as any)[key] = value;
        }
      });

      setSettings(loadedSettings);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
      // Use default settings on error
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      // Convert value to string for API
      let stringValue: string;
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }

      await settingsApi.update(key, stringValue);

      // Update local state immediately (optimistic update)
      if (settings) {
        setSettings({
          ...settings,
          [key]: value
        });
      }
    } catch (err) {
      console.error(`Failed to update setting ${key}:`, err);
      throw err;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        error,
        updateSetting,
        refreshSettings
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
