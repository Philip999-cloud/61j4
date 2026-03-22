/**
 * authSecurityUtils.ts
 * 
 * Usage:
 * import { checkDeviceBinding, createSoftDeletePayload } from './utils/authSecurityUtils';
 */

interface DeviceInfo {
  deviceId: string;
  ip: string;
  userAgent: string;
}

// Mock storage for trusted devices (in a real app, this would come from the backend)
const TRUSTED_DEVICES_KEY = 'trusted_devices_hash';

/**
 * Checks if the current device matches trusted devices.
 * Returns true if a security alert should be triggered.
 */
export const checkDeviceBinding = (currentDevice: DeviceInfo): boolean => {
  try {
    const storedHash = localStorage.getItem(TRUSTED_DEVICES_KEY);
    
    // Simple hash generation for demonstration
    const currentHash = btoa(`${currentDevice.deviceId}-${currentDevice.userAgent}`);
    
    if (!storedHash) {
      // First time login, trust this device
      localStorage.setItem(TRUSTED_DEVICES_KEY, currentHash);
      return false;
    }

    // If hash doesn't match, it's a new device or IP changed significantly
    // Note: IP checks usually happen server-side, client-side we focus on device/browser fingerprint
    if (storedHash !== currentHash) {
      return true; // Trigger alert
    }

    return false;
  } catch (e) {
    console.error('Device binding check failed', e);
    return false;
  }
};

interface SoftDeletePayload {
  status: 'pending_delete';
  deleteAt: string; // ISO date string
  reason?: string;
}

/**
 * Creates a payload for soft deletion instead of hard deletion.
 */
export const createSoftDeletePayload = (reason?: string): SoftDeletePayload => {
  const deleteDate = new Date();
  deleteDate.setDate(deleteDate.getDate() + 30); // 30 days later

  return {
    status: 'pending_delete',
    deleteAt: deleteDate.toISOString(),
    reason
  };
};
