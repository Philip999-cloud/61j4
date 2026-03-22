import { useState, useCallback } from 'react';

interface AuthEnhancerResult {
  loginWithMagicLink: (email: string) => Promise<boolean>;
  verifyBiometrics: () => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * useAuthEnhancer
 * A hook to enhance authentication with Magic Link and Biometrics (WebAuthn simulation).
 */
export const useAuthEnhancer = (): AuthEnhancerResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginWithMagicLink = useCallback(async (email: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // Simulate success
      console.log(`Magic link sent to ${email}`);
      setIsLoading(false);
      return true;
    } catch (err) {
      setError('Failed to send magic link. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, []);

  const verifyBiometrics = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('Biometrics not supported on this device.');
      }

      // Simulate WebAuthn challenge/response delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate successful verification
      console.log('Biometric verification successful');
      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Biometric verification failed.');
      setIsLoading(false);
      return false;
    }
  }, []);

  return {
    loginWithMagicLink,
    verifyBiometrics,
    isLoading,
    error,
  };
};
