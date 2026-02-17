import type { RecordModel } from "pocketbase";
import { pb } from "./pocketbase";

export type AuthUser = RecordModel | null;

/**
 * Sign in with an OAuth2 provider (e.g. "google", "apple").
 * Opens a popup window for the OAuth flow -- no redirects or page reloads.
 *
 * On success, the PocketBase authStore is automatically updated.
 */
export async function signInWithOAuth(provider: string): Promise<RecordModel> {
  const authData = await pb.collection("users").authWithOAuth2({ provider });
  return authData.record;
}

/**
 * Sign out the current user.
 * Clears the PocketBase auth store.
 */
export function signOut(): void {
  pb.authStore.clear();
}

/**
 * Get the currently authenticated user, or null if not signed in.
 */
export function getCurrentUser(): AuthUser {
  return pb.authStore.record;
}

/**
 * Check whether the current auth token is still valid.
 */
export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

/**
 * Refresh the current auth token and record.
 * Useful on app startup to verify the stored session is still valid.
 */
export async function refreshAuth(): Promise<AuthUser> {
  if (!pb.authStore.isValid) {
    return null;
  }

  try {
    const authData = await pb.collection("users").authRefresh();
    return authData.record;
  } catch {
    pb.authStore.clear();
    return null;
  }
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthChange(
  callback: (user: AuthUser) => void
): () => void {
  return pb.authStore.onChange((_token, record) => {
    callback(record);
  });
}
