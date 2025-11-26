
// Import the functions you need from the SDKs you need
import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/firestore";
import { SavedProfile } from "../types";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwAjeVdsdVR_MntvpaDlTV-0ELEuU0vy8",
  authDomain: "fesautodoc.firebaseapp.com",
  projectId: "fesautodoc",
  storageBucket: "fesautodoc.firebasestorage.app",
  messagingSenderId: "816057869762",
  appId: "1:816057869762:web:31e2e54445b44ccd67225b",
  measurementId: "G-XGH6X591TP"
};

// Initialize Firebase
const app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.app();

export const db = firebase.firestore();

// Force long polling to avoid websocket issues on some networks and improve reliability
db.settings({
    experimentalForceLongPolling: true,
});

// Enable offline persistence
// This allows the app to work offline and loads data faster on subsequent visits
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code == 'failed-precondition') {
      console.warn("Firebase persistence failed: Multiple tabs open.");
  } else if (err.code == 'unimplemented') {
      console.warn("Firebase persistence not supported by this browser.");
  }
});

const profilesRef = db.collection('profiles');

// Timeout Helper: Fails if promise takes longer than 60 seconds (increased from 30s)
const TIMEOUT_MS = 60000;
const withTimeout = <T>(promise: Promise<T>, opName: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`Thao tác "${opName}" quá lâu (quá 60s). Vui lòng kiểm tra mạng.`)), TIMEOUT_MS)
        )
    ]);
};

// CRUD Helpers

export const getProfilesFromCloud = async (): Promise<SavedProfile[]> => {
  try {
    const snapshot = await withTimeout(profilesRef.get(), "Tải danh sách hồ sơ");
    return snapshot.docs.map(doc => doc.data() as SavedProfile);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    throw error;
  }
};

export const saveProfileToCloud = async (profile: SavedProfile) => {
  try {
    // Firestore limit is ~1MB per document. Base64 images can exceed this.
    // Simple check: string length of JSON roughly correlates to bytes.
    const size = new Blob([JSON.stringify(profile)]).size;
    if (size > 1000000) { // 1MB limit
      throw new Error("Ảnh CCCD quá lớn (>1MB). Vui lòng nén ảnh hoặc dùng ảnh dung lượng thấp hơn trước khi lưu.");
    }

    await withTimeout(profilesRef.doc(profile.id).set(profile), "Lưu hồ sơ mới");
  } catch (error) {
    console.error("Error saving profile:", error);
    throw error;
  }
};

export const updateProfileOnCloud = async (profile: SavedProfile) => {
  try {
    const size = new Blob([JSON.stringify(profile)]).size;
    if (size > 1000000) {
      throw new Error("Ảnh CCCD quá lớn (>1MB). Vui lòng nén ảnh hoặc dùng ảnh dung lượng thấp hơn.");
    }
    
    // Use set with merge: true instead of update to handle new fields better
    await withTimeout(profilesRef.doc(profile.id).set(profile, { merge: true }), "Cập nhật hồ sơ");
  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  }
};

export const deleteProfileFromCloud = async (id: string) => {
  try {
    await withTimeout(profilesRef.doc(id).delete(), "Xóa hồ sơ");
  } catch (error) {
    console.error("Error deleting profile:", error);
    throw error;
  }
};
