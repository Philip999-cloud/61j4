import React, { useState } from 'react';
import { useA11yHaptics } from '../hooks/useA11yHaptics';

interface NotificationSettingsGroupProps {
  initialSettings?: {
    system: boolean;
    marketing: boolean;
    social: boolean;
    personal: boolean;
    dndEnabled: boolean;
    dndStart: string;
    dndEnd: string;
  };
  onChange?: (settings: any) => void;
  className?: string;
}

export const NotificationSettingsGroup: React.FC<NotificationSettingsGroupProps> = ({
  initialSettings = {
    system: true,
    marketing: false,
    social: true,
    personal: true,
    dndEnabled: false,
    dndStart: '22:00',
    dndEnd: '07:00'
  },
  onChange,
  className = ''
}) => {
  const [settings, setSettings] = useState(initialSettings);
  const { triggerLightTouch } = useA11yHaptics();

  const handleToggle = (key: keyof typeof settings) => {
    triggerLightTouch();
    const newSettings = { ...settings, [key]: !settings[key as keyof typeof settings] };
    setSettings(newSettings);
    if (onChange) onChange(newSettings);
  };

  const handleTimeChange = (key: 'dndStart' | 'dndEnd', value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (onChange) onChange(newSettings);
  };

  const ToggleItem = ({ label, settingKey }: { label: string, settingKey: keyof typeof settings }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-gray-700 font-medium">{label}</span>
      <button
        onClick={() => handleToggle(settingKey)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          settings[settingKey as keyof typeof settings] ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            settings[settingKey as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
      </div>
      
      <div className="p-4">
        <ToggleItem label="System Updates" settingKey="system" />
        <ToggleItem label="Marketing & Offers" settingKey="marketing" />
        <ToggleItem label="Social Interactions" settingKey="social" />
        <ToggleItem label="Personal Messages" settingKey="personal" />
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-800">Do Not Disturb</h4>
          <button
            onClick={() => handleToggle('dndEnabled')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.dndEnabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.dndEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.dndEnabled && (
          <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start Time</label>
              <input
                type="time"
                value={settings.dndStart}
                onChange={(e) => handleTimeChange('dndStart', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End Time</label>
              <input
                type="time"
                value={settings.dndEnd}
                onChange={(e) => handleTimeChange('dndEnd', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
