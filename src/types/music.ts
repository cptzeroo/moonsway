/**
 * Core music data types for Moonsway.
 * Minified shapes stored in PocketBase and IndexedDB.
 */

// -- Artists --

export interface ArtistMinified {
  id: string;
  name: string;
  picture?: string;
}

export interface Artist extends ArtistMinified {
  addedAt?: string;
}

// -- Albums --

export interface AlbumMinified {
  id: string;
  title: string;
  cover?: string;
  releaseDate?: string;
  artist: ArtistMinified;
  numberOfTracks?: number;
}

export interface Album extends AlbumMinified {
  addedAt?: string;
  explicit?: boolean;
  type?: string;
  vibrantColor?: string;
}

// -- Tracks --

export interface Track {
  id: string;
  title: string;
  duration: number;
  explicit?: boolean;
  artist: ArtistMinified;
  artists?: ArtistMinified[];
  album: AlbumMinified;
  copyright?: string;
  isrc?: string;
  trackNumber?: number;
  version?: string;
  addedAt?: string;
}

// -- Playlists --

export interface PlaylistTrack extends Track {
  addedToPlaylistAt?: string;
}

export interface Playlist {
  id: string;
  name: string;
  cover?: string;
  description?: string;
  tracks: PlaylistTrack[];
  isPublic: boolean;
  numberOfTracks: number;
  createdAt?: string;
  updatedAt?: string;
}

// -- Favorites --

export type FavoriteItemType = "track" | "album" | "artist" | "playlist";

export interface Favorite {
  id?: string;
  user: string;
  itemType: FavoriteItemType;
  itemId: string;
  metadata: Track | Album | Artist | Playlist;
  addedAt?: string;
}

// -- History --

export interface HistoryEntry {
  id?: string;
  user: string;
  trackId: string;
  metadata: Track;
  playedAt?: string;
}

// -- Settings --

export interface UserSetting {
  id?: string;
  user: string;
  key: string;
  value: unknown;
}

// -- PocketBase record wrappers --

export interface PBRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
}

export interface PBFavorite extends PBRecord {
  user: string;
  item_type: FavoriteItemType;
  item_id: string;
  metadata: Track | Album | Artist | Playlist;
}

export interface PBPlaylist extends PBRecord {
  user: string;
  name: string;
  cover: string;
  description: string;
  tracks: PlaylistTrack[];
  is_public: boolean;
}

export interface PBHistory extends PBRecord {
  user: string;
  track_id: string;
  metadata: Track;
}

export interface PBSetting extends PBRecord {
  user: string;
  key: string;
  value: unknown;
}
