import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { AuthUser } from "@/lib/auth";
import {
  getCurrentUser,
  isAuthenticated,
  onAuthChange,
  refreshAuth,
  signInWithOAuth,
  signOut,
} from "@/lib/auth";

/**
 * Snapshot-based store so React can subscribe to PocketBase auth changes
 * without extra re-renders.
 */
let currentUser: AuthUser = getCurrentUser();

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): AuthUser {
  return currentUser;
}

// Wire PocketBase's onChange into the snapshot store
onAuthChange((user) => {
  currentUser = user;
  for (const listener of listeners) {
    listener();
  }
});

/**
 * React hook for PocketBase auth state.
 *
 * Returns the current user (or null), loading state,
 * and auth actions (signIn, signOut).
 */
export function useAuth() {
  const user = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // On mount, refresh the token to verify session validity
  useEffect(() => {
    refreshAuth();
  }, []);

  const handleSignIn = useCallback(async (provider: string) => {
    return signInWithOAuth(provider);
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  return {
    user,
    isAuthenticated: isAuthenticated(),
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}
