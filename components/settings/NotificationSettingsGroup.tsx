import React, { useState } from 'react';

interface NotificationSettings {
  systemUpdates: boolean;
  socialInteractions: boolean;
  marketingOffers: boolean;
  doNotDisturb: boolean;
}

interface NotificationSettingsGroupProps {
  initialSettings?: Partial<NotificationSettings>;
  onChange?: (settings: NotificationSettings) => void;
  className?: string;
}

/**
 * NotificationSettingsGroup
 * A standalone settings group for notification preferences.
 */
export const NotificationSettingsGroup: React.FC<NotificationSettingsGroupProps> = ({
  initialSettings = {},
  onChange,
  className = ''
}) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    systemUpdates: true,
    socialInteractions: true,
    marketingOffers: false,
    doNotDisturb: false,
    ...initialSettings
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    if (onChange) {
      onChange(newSettings);
    }
  };

  const ToggleSwitch = ({ 
    label, 
    description, 
    checked, 
    onToggle 
  }: { 
    label: string; 
    description?: string; 
    checked: boolean; 
    onToggle: () => void; 
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {description && <span className="text-xs text-slate-500 mt-0.5">{description}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          checked ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
          Advanced Controls
        </h3>
      </div>
      <div className="px-4">
        <ToggleSwitch
          label="System Updates"
          description="Get notified about major app improvements."
          checked={settings.systemUpdates}
          onToggle={() => handleToggle('systemUpdates')}
        />
        <ToggleSwitch
          label="Social Interactions"
          description="When someone comments on your work."
          checked={settings.socialInteractions}
          onToggle={() => handleToggle('socialInteractions')}
        />
        <ToggleSwitch
          label="Marketing Offers"
          description="Exclusive deals and partner promotions."
          checked={settings.marketingOffers}
          onToggle={() => handleToggle('marketingOffers')}
        />
        <ToggleSwitch
          label="Do Not Disturb (Night Mode)"
          description="Mute all notifications from 10 PM to 7 AM."
          checked={settings.doNotDisturb}
          onToggle={() => handleToggle('doNotDisturb')}
        />
      </div>
    </div>
  );
};
