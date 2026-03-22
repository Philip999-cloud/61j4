import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface UserSettings {
  isPrivateProfile: boolean;
  updatedAt?: ReturnType<typeof serverTimestamp>;
}

const DEFAULT_SETTINGS: UserSettings = {
  isPrivateProfile: false
};

const SETTINGS_DOC_ID = 'main';

export const userSettingsService = {
  async getSettings(uid: string): Promise<UserSettings> {
    try {
      const ref = doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return {
          isPrivateProfile: data?.isPrivateProfile ?? false,
          updatedAt: data?.updatedAt
        };
      }
      return { ...DEFAULT_SETTINGS };
    } catch (err) {
      console.error('userSettingsService.getSettings:', err);
      return { ...DEFAULT_SETTINGS };
    }
  },

  async updatePrivacyMode(uid: string, isPrivateProfile: boolean): Promise<void> {
    try {
      const ref = doc(db, 'users', uid, 'settings', SETTINGS_DOC_ID);
      await setDoc(ref, { isPrivateProfile, updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error('userSettingsService.updatePrivacyMode:', err);
      throw err;
    }
  }
};
