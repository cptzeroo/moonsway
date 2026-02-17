import PocketBase from "pocketbase";
import type { RecordService, RecordModel } from "pocketbase";
import type {
  PBFavorite,
  PBPlaylist,
  PBHistory,
  PBSetting,
} from "@/types/music";

const POCKETBASE_URL = "http://127.0.0.1:8090";

export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation for real-time subscriptions
pb.autoCancellation(false);

// -- Typed collection accessors --

export function usersCollection(): RecordService<RecordModel> {
  return pb.collection("users");
}

export function favoritesCollection(): RecordService<PBFavorite> {
  return pb.collection("favorites") as RecordService<PBFavorite>;
}

export function playlistsCollection(): RecordService<PBPlaylist> {
  return pb.collection("playlists") as RecordService<PBPlaylist>;
}

export function historyCollection(): RecordService<PBHistory> {
  return pb.collection("history") as RecordService<PBHistory>;
}

export function settingsCollection(): RecordService<PBSetting> {
  return pb.collection("settings") as RecordService<PBSetting>;
}
