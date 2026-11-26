import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  increment,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  OperationType,
  handleFirestoreError,
  signInWithGoogle,
  signOutUser,
} from '../firebase';

interface FirebaseContextValue {
  user: User | null;
  isAuthReady: boolean;
  isAdmin: boolean;
  isSigningIn: boolean;
  authError: string | null;
  videoCredits: number;
  addCredits: (amount: number) => Promise<void>;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;

function sanitizeString(value: string | null | undefined, maxLength: number, fallback = ''): string {
  const trimmed = (value || fallback).trim();
  return trimmed.slice(0, maxLength);
}

async function syncUserDocuments(firebaseUser: User) {
  if (!ID_PATTERN.test(firebaseUser.uid) || firebaseUser.uid.length > 128) {
    return;
  }
  if (!firebaseUser.emailVerified) {
    return;
  }

  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const privateDocRef = doc(db, 'users', firebaseUser.uid, 'private', 'info');

  let existingSnap;
  try {
    existingSnap = await getDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
  }

  const safeDisplayName = sanitizeString(firebaseUser.displayName, 80, 'Fan BGla Mac');
  const safePhotoUrl = sanitizeString(firebaseUser.photoURL, 500);
  const safeEmail = sanitizeString(firebaseUser.email, 200);

  try {
    const batch = writeBatch(db);
    if (!existingSnap.exists()) {
      const profilePayload: Record<string, unknown> = {
        uid: firebaseUser.uid,
        displayName: safeDisplayName,
        role: 'fan',
        videoCredits: 5, // 5 free initial credits for new users
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (safePhotoUrl) {
        profilePayload.photoURL = safePhotoUrl;
      }
      batch.set(userDocRef, profilePayload);
    } else {
      const updatePayload: Record<string, unknown> = {
        displayName: safeDisplayName,
        updatedAt: serverTimestamp(),
      };
      if (safePhotoUrl) {
        updatePayload.photoURL = safePhotoUrl;
      }
      batch.update(userDocRef, updatePayload);
    }

    const privatePayload: Record<string, unknown> = {
      uid: firebaseUser.uid,
      updatedAt: serverTimestamp(),
    };
    if (safeEmail) {
      privatePayload.email = safeEmail;
    }
    batch.set(privateDocRef, privatePayload, { merge: true });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
  }
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [videoCredits, setVideoCredits] = useState<number>(5);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      if (currentUser) {
        try {
          await syncUserDocuments(currentUser);
        } catch (err) {
          console.error('Failed to sync user profile to Firestore:', err);
        }
      } else {
        setVideoCredits(5);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Real-time listener for user credits in Firestore
  useEffect(() => {
    if (!user || !user.emailVerified) {
      setVideoCredits(5);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.videoCredits === 'number') {
            setVideoCredits(data.videoCredits);
          }
        }
      },
      (error) => {
        console.warn('Failed to listen to user profile credits:', error);
      }
    );

    return () => unsubscribeProfile();
  }, [user]);

  const addCredits = async (amount: number) => {
    if (!user || !user.emailVerified) {
      // Guest mode: update local state
      setVideoCredits((prev) => Math.max(0, prev + amount));
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        videoCredits: increment(amount),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const signIn = async () => {
    try {
      setIsSigningIn(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Erreur lors de la connexion Google.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const logout = async () => {
    try {
      setAuthError(null);
      await signOutUser();
    } catch (err: any) {
      setAuthError(err?.message || 'Erreur lors de la déconnexion.');
    }
  };

  const isAdmin = Boolean(
    user?.emailVerified && user.email === 'marakaoude@gmail.com'
  );

  return (
    <FirebaseContext.Provider
      value={{
        user,
        isAuthReady,
        isAdmin,
        isSigningIn,
        authError,
        videoCredits,
        addCredits,
        signIn,
        logout,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export function useFirebase(): FirebaseContextValue {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside a FirebaseProvider');
  }
  return ctx;
}
