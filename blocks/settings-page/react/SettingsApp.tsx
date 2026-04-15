import React from 'react';
import { useStorage } from './useStorage';

// TODO: define your settings type and defaults in a separate types.ts file,
// then import and pass them to useStorage. Example:
//
//   import { useStorage } from './useStorage';
//   import type { MySettings } from './types';
//   import { DEFAULT_SETTINGS, SETTINGS_KEY } from './types';
//
//   const [settings, setSettings] = useStorage<MySettings>(SETTINGS_KEY, DEFAULT_SETTINGS);

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  backgroundColor: '#f9fafb',
  color: '#111827',
  padding: '48px 24px',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
};

const headerStyle: React.CSSProperties = {
  marginBottom: '32px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 700,
  margin: '0 0 8px 0',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '15px',
  color: '#6b7280',
  margin: 0,
};

const sectionStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '24px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#6b7280',
  marginBottom: '16px',
  paddingBottom: '12px',
  borderBottom: '1px solid #f3f4f6',
};

const placeholderStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#9ca3af',
  fontStyle: 'italic',
};

// TODO: replace placeholder extension name with your own
const EXTENSION_NAME = 'My Extension';

export const SettingsApp: React.FC = () => {
  // TODO: replace 'myExtensionSettings' and {} with your settings key and defaults
  const [_settings, _setSettings] = useStorage<Record<string, unknown>>(
    'myExtensionSettings',
    {}
  );

  // TODO: read the extension version from the manifest if needed
  // const version = chrome.runtime.getManifest().version;

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <header style={headerStyle}>
          {/* TODO: replace with your extension name and description */}
          <h1 style={titleStyle}>{EXTENSION_NAME}</h1>
          <p style={subtitleStyle}>Configure your extension settings</p>
        </header>

        {/* TODO: add your settings sections here.
            Each section groups related settings.
            Use useStorage (or a typed wrapper) to read/write values.

            Example section:

            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>General</h2>
              <label>
                <span>Enable notifications</span>
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, notificationsEnabled: e.target.checked })
                  }
                />
              </label>
            </section>
        */}

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>General</h2>
          {/* TODO: add your settings fields here */}
          <p style={placeholderStyle}>No settings configured yet.</p>
        </section>
      </div>
    </div>
  );
};
