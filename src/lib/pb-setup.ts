import { pb } from "./pocketbase";

/**
 * Collection schemas for Moonsway.
 * Each entry defines a PocketBase collection to auto-create on startup.
 *
 * PocketBase v0.36+ uses the `fields` array format for collection schemas.
 * The built-in `users` auth collection is created by PocketBase automatically.
 */

const COLLECTION_SCHEMAS: Record<string, object> = {
  favorites: {
    name: "favorites",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
      { name: "item_type", type: "text", required: true },
      { name: "item_id", type: "text", required: true },
      { name: "metadata", type: "json", required: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_favorites_unique ON favorites (user, item_type, item_id)",
    ],
    listRule: "@request.auth.id = user",
    viewRule: "@request.auth.id = user",
    createRule: "@request.auth.id = user",
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user",
  },

  playlists: {
    name: "playlists",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
      { name: "name", type: "text", required: true },
      { name: "cover", type: "text", required: false },
      { name: "description", type: "text", required: false },
      { name: "tracks", type: "json", required: false },
      { name: "is_public", type: "bool", required: false },
    ],
    listRule: "@request.auth.id = user || is_public = true",
    viewRule: "@request.auth.id = user || is_public = true",
    createRule: "@request.auth.id = user",
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user",
  },

  history: {
    name: "history",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
      { name: "track_id", type: "text", required: true },
      { name: "metadata", type: "json", required: false },
    ],
    listRule: "@request.auth.id = user",
    viewRule: "@request.auth.id = user",
    createRule: "@request.auth.id = user",
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user",
  },

  settings: {
    name: "settings",
    type: "base",
    fields: [
      { name: "user", type: "relation", required: true, options: { collectionId: "_pb_users_auth_", maxSelect: 1 } },
      { name: "key", type: "text", required: true },
      { name: "value", type: "json", required: false },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_settings_unique ON settings (user, key)",
    ],
    listRule: "@request.auth.id = user",
    viewRule: "@request.auth.id = user",
    createRule: "@request.auth.id = user",
    updateRule: "@request.auth.id = user",
    deleteRule: "@request.auth.id = user",
  },
};

/**
 * Check for required collections and create any that are missing.
 * Called once on app startup. Requires superuser auth for collection management.
 *
 * Uses the PocketBase REST API: GET /api/collections to list existing,
 * POST /api/collections to create missing ones.
 */
export async function ensureCollections(): Promise<void> {
  try {
    const existing = await pb.collections.getFullList();
    const existingNames = new Set(existing.map((c) => c.name));

    for (const [name, schema] of Object.entries(COLLECTION_SCHEMAS)) {
      if (existingNames.has(name)) {
        continue;
      }

      try {
        await pb.collections.create(schema);
        console.log(`[Moonsway] Created collection: ${name}`);
      } catch (err) {
        console.error(`[Moonsway] Failed to create collection "${name}":`, err);
      }
    }
  } catch (err) {
    // Collections API requires superuser auth -- if not authenticated as
    // superuser, this will fail with 403. That's expected for normal users;
    // collections should be created once via the PocketBase dashboard or
    // by running ensureCollections() after superuser auth.
    console.warn(
      "[Moonsway] Could not verify collections (superuser auth may be required):",
      err
    );
  }
}
