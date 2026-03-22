/**
 * deviceSupportHelper.ts
 * Utility to gather device information for support requests.
 */

interface DeviceSupportInfo {
  userAgent: string;
  language: string;
  screenResolution: string;
  platform: string;
  timestamp: string;
  url: string;
}

/**
 * Gathers current environment information.
 */
const getDeviceInfo = (): DeviceSupportInfo => {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'Unknown',
      language: 'Unknown',
      screenResolution: 'Unknown',
      platform: 'Unknown',
      timestamp: new Date().toISOString(),
      url: 'Unknown'
    };
  }

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    platform: navigator.platform,
    timestamp: new Date().toISOString(),
    url: window.location.href
  };
};

/**
 * Generates a mailto: link with pre-filled body containing device info.
 * @param supportEmail The destination email address.
 * @param subject The email subject line.
 */
export const generateSupportEmail = (
  supportEmail: string = 'support@example.com',
  subject: string = 'App Support Request'
): void => {
  const info = getDeviceInfo();
  
  const body = `
  
  --- Please describe your issue above ---
  
  Technical Details (automatically attached):
  User Agent: ${info.userAgent}
  Platform: ${info.platform}
  Screen: ${info.screenResolution}
  Language: ${info.language}
  Time: ${info.timestamp}
  URL: ${info.url}
  `;

  const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  window.location.href = mailtoLink;
};
