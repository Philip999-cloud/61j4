import { useEffect } from 'react';

export const useAuthSecurity = () => {
  useEffect(() => {
    const storedDeviceId = localStorage.getItem('deviceId');
    const currentDeviceId = navigator.userAgent + window.screen.width + window.screen.height; // Simple fingerprint

    if (!storedDeviceId) {
      localStorage.setItem('deviceId', currentDeviceId);
    } else if (storedDeviceId !== currentDeviceId) {
      // 視窗尺寸或 UA 變更即會觸發，屬預期情況；避免用 console.warn 誤導為安全事件
      console.debug('[useAuthSecurity] device fingerprint changed');
      // In a real app, trigger an email alert here
    }
  }, []);

  const softDeleteAccount = async (): Promise<{ success: boolean; message: string }> => {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Account marked for soft deletion.');
        resolve({
          success: true,
          message: 'Account scheduled for deletion in 30 days. Login again to cancel.',
        });
      }, 1000);
    });
  };

  return { softDeleteAccount };
};
