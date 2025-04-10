'use client';

import React, { createContext, useState, useContext, ReactNode } from 'react';

// Define the shape of the auth state (same as in MCPClient)
type AuthState = {
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  expiresAt: number | null;
  scope: string | null;
};

// Define the context type
interface AuthContextType {
  authState: AuthState;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
  // Potentially add login/logout functions here later
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    status: 'idle',
    accessToken: null,
    refreshToken: null,
    error: null,
    expiresAt: null,
    scope: null,
  });

  return (
    <AuthContext.Provider value={{ authState, setAuthState }}>
      {children}
    </AuthContext.Provider>
  );
}

// Create a custom hook for easy access to the context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
