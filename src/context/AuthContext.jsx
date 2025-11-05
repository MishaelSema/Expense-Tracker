import { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Handle online/offline status and visibility changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // When coming back online, refresh auth token
      if (auth.currentUser) {
        auth.currentUser.getIdToken(true).catch((error) => {
          console.log('Token refresh error (will retry):', error);
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    // Handle visibility change (when user switches tabs or comes back)
    const handleVisibilityChange = () => {
      if (!document.hidden && auth.currentUser) {
        // Refresh token when user comes back to the tab
        auth.currentUser.getIdToken(true).catch((error) => {
          console.log('Token refresh on visibility change error:', error);
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  function signup(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setLoading(false);
    });

    // Listen for token changes and refresh automatically
    const unsubscribeToken = onIdTokenChanged(auth, async (user) => {
      if (user) {
        try {
          // Refresh token periodically to prevent expiration
          await user.getIdToken(true);
        } catch (error) {
          console.log('Token refresh error (non-critical):', error);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    isOnline,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
