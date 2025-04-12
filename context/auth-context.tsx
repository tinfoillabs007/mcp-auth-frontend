'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';

// Define the shape of the auth state
type AuthState = {
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  expiresAt: number | null;
  scope: string | null;
  supabaseUserId: string | null;
};

// Define the context type
interface AuthContextType {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  login: (tokenData: any) => void;
  logout: () => void;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const AUTH_STATE_KEY = 'mcp_auth_state';

// Create the provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  // ALWAYS initialize with the default state on both server and client initial render
  const [authState, setAuthState] = useState<AuthState>({
    status: 'idle', // Or 'loading' if you prefer to show a loader initially
    accessToken: null,
    refreshToken: null,
    error: null,
    expiresAt: null,
    scope: null,
    supabaseUserId: null,
  });

  // NEW: Effect to load state from storage ONLY on the client AFTER initial mount
  useEffect(() => {
    console.log("AuthProvider: Checking localStorage on client mount...");
    const storedState = localStorage.getItem(AUTH_STATE_KEY);
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState) as AuthState;
        if (parsedState.accessToken && parsedState.expiresAt && parsedState.expiresAt > Date.now()) {
          console.log('AuthProvider: Restoring valid auth state from storage via useEffect.');
          // Use setAuthState to update state AFTER initial render
          setAuthState({ ...parsedState, status: 'authenticated' }); 
        } else {
          // Clear invalid/expired state found in storage
           console.log('AuthProvider: Stored state invalid or expired, removing.');
          localStorage.removeItem(AUTH_STATE_KEY);
          // Optionally set state back to idle if it wasn't already
          // setAuthState(prev => prev.status !== 'idle' ? { ...initialIdleState } : prev);
        }
      } catch (e) {
        console.error('AuthProvider: Failed to parse stored auth state in useEffect.', e);
        localStorage.removeItem(AUTH_STATE_KEY);
      }
    } else {
        console.log("AuthProvider: No auth state found in storage.");
    }
  }, []); // Empty dependency array ensures this runs only once on client mount

  // Persist auth state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
        // Persist ONLY if fully authenticated and valid
        if (authState.status === 'authenticated' && authState.accessToken && authState.expiresAt && authState.expiresAt > Date.now()) {
            console.log('AuthProvider: Persisting auth state to storage.');
            // Ensure we are saving the *current* authState, including supabaseUserId if present
            localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authState)); 
        } else if (localStorage.getItem(AUTH_STATE_KEY)) {
             // Clear storage ONLY if the state is NOT validly authenticated AND something is currently stored
             console.log(`AuthProvider: Clearing storage because status is ${authState.status} (or token invalid/expired) and item exists.`);
             localStorage.removeItem(AUTH_STATE_KEY);
        }
        // Do nothing if not authenticated AND nothing is stored
    }
  }, [authState]); // Run whenever authState changes

  // Helper function to update state upon successful login
  const login = (tokenData: any) => {
    console.log('AuthProvider: login called with token data:', tokenData);
    const expiresAt = Date.now() + (tokenData.expires_in || 3600) * 1000; // Calculate expiry time
    const newState: AuthState = {
        status: 'authenticated',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        error: null,
        expiresAt: expiresAt,
        scope: tokenData.scope || null,
        supabaseUserId: tokenData.supabase_user_id || null,
    };
    setAuthState(newState);
    if (!tokenData.supabase_user_id) {
        console.warn('AuthProvider: Supabase User ID was missing from login token data!');
    }
  };

  // Helper function to clear state on logout
  const logout = () => {
    console.log('AuthProvider: logout called.');
    setAuthState({
        status: 'idle',
        accessToken: null,
        refreshToken: null,
        error: null,
        expiresAt: null,
        scope: null,
        supabaseUserId: null,
    });
    // No need to explicitly clear storage here, the useEffect handles it
  };

  return (
    <AuthContext.Provider value={{ authState, setAuthState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook remains the same, but now returns the updated context type
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Context now includes { authState: { ..., supabaseUserId: string | null }, login, logout }
  return context;
}
