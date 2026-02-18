import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Search as SearchIcon, Loader2, Music, Disc3, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrackList } from "@/components/track-list";
import { usePlayerStore } from "@/stores/player-store";
import {
  searchTracks,
  searchAlbums,
  searchArtists,
  getCoverUrl,
  getArtistPictureUrl,
} from "@/lib/api/music-api";
import type { Track, Album, ArtistMinified } from "@/types/music";

const DEBOUNCE_MS = 300;

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<ArtistMinified[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const playTrack = usePlayerStore((s) => s.playTrack);

  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setTracks([]);
      setAlbums([]);
      setArtists([]);
      setHasSearched(false);
      return;
    }

    // Cancel previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const [trackRes, albumRes, artistRes] = await Promise.all([
        searchTracks(q, controller.signal),
        searchAlbums(q, controller.signal),
        searchArtists(q, controller.signal),
      ]);

      if (!controller.signal.aborted) {
        setTracks(trackRes.items);
        setAlbums(albumRes.items);
        setArtists(artistRes.items);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("[Search] Failed:", error);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, performSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handlePlayTrack = useCallback(
    (track: Track, _index: number) => {
      playTrack(track, tracks);
    },
    [playTrack, tracks]
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Search bar */}
      <div className="relative max-w-xl">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search for tracks, albums, or artists..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          autoFocus
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      {!hasSearched ? (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <SearchIcon className="mb-3 size-12 opacity-20" />
          <p className="text-sm">Search for your favorite music</p>
        </div>
      ) : isLoading && tracks.length === 0 ? (
        <SearchSkeleton />
      ) : tracks.length === 0 && albums.length === 0 && artists.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <p className="text-sm">No results found for "{query}"</p>
        </div>
      ) : (
        <Tabs defaultValue="tracks" className="flex-1">
          <TabsList>
            <TabsTrigger value="tracks" className="gap-1.5">
              <Music className="size-3.5" />
              Tracks ({tracks.length})
            </TabsTrigger>
            <TabsTrigger value="albums" className="gap-1.5">
              <Disc3 className="size-3.5" />
              Albums ({albums.length})
            </TabsTrigger>
            <TabsTrigger value="artists" className="gap-1.5">
              <User className="size-3.5" />
              Artists ({artists.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="mt-4">
            {tracks.length > 0 ? (
              <TrackList tracks={tracks} onPlay={handlePlayTrack} />
            ) : (
              <EmptyTab message="No tracks found" />
            )}
          </TabsContent>

          <TabsContent value="albums" className="mt-4">
            {albums.length > 0 ? (
              <AlbumGrid albums={albums} />
            ) : (
              <EmptyTab message="No albums found" />
            )}
          </TabsContent>

          <TabsContent value="artists" className="mt-4">
            {artists.length > 0 ? (
              <ArtistGrid artists={artists} />
            ) : (
              <EmptyTab message="No artists found" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// -- Sub-components --

function EmptyTab({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function AlbumGrid({ albums }: { albums: Album[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
      {albums.map((album) => {
        const coverUrl = album.cover ? getCoverUrl(album.cover, "320") : "";
        return (
          <Link
            key={album.id}
            to={`/album/${album.id}`}
            className="group flex flex-col gap-2 rounded-lg p-3 transition-colors hover:bg-accent/50"
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="aspect-square w-full rounded-md object-cover"
              />
            ) : (
              <div className="aspect-square w-full rounded-md bg-muted" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{album.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {album.artist?.name ?? "Unknown Artist"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function ArtistGrid({ artists }: { artists: ArtistMinified[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
      {artists.map((artist) => {
        const pictureUrl = artist.picture
          ? getArtistPictureUrl(artist.picture, "320")
          : "";
        return (
          <Link
            key={artist.id}
            to={`/artist/${artist.id}`}
            className="group flex flex-col items-center gap-2 rounded-lg p-3 transition-colors hover:bg-accent/50"
          >
            {pictureUrl ? (
              <img
                src={pictureUrl}
                alt=""
                className="size-28 rounded-full object-cover"
              />
            ) : (
              <div className="size-28 rounded-full bg-muted" />
            )}
            <p className="truncate text-sm font-medium">{artist.name}</p>
          </Link>
        );
      })}
    </div>
  );
}

function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2">
          <Skeleton className="size-4" />
          <Skeleton className="size-8 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
