import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Clock, ListMusic, Play } from "lucide-react";
import { getPlaylist, getCoverUrl } from "@/lib/api/music-api";
import { TrackList } from "@/components/track-list";
import { usePlayerStore } from "@/stores/player-store";
import { formatTime } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import type { Track } from "@/types/music";

interface PlaylistDetail {
  id: string;
  title: string;
  image?: string;
  numberOfTracks: number;
  tracks: Track[];
}

export function PlaylistPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const playTrack = usePlayerStore((s) => s.playTrack);
  const playQueue = usePlayerStore((s) => s.playQueue);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    getPlaylist(id)
      .then((result: PlaylistDetail) => {
        if (cancelled) return;
        setPlaylist(result);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Playlist] Failed to load:", err);
        setError("Failed to load playlist");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handlePlayTrack = useCallback(
    (track: Track, _index: number) => {
      if (playlist) {
        playTrack(track, playlist.tracks);
      }
    },
    [playTrack, playlist]
  );

  const handlePlayAll = useCallback(() => {
    if (playlist && playlist.tracks.length > 0) {
      playQueue(playlist.tracks, 0);
    }
  }, [playQueue, playlist]);

  if (isLoading) return <PlaylistSkeleton />;

  if (error || !playlist) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-sm text-muted-foreground">{error ?? "Playlist not found"}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-primary hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const coverUrl = playlist.image ? getCoverUrl(playlist.image, "640") : "";
  const totalDuration = playlist.tracks.reduce((sum, t) => sum + t.duration, 0);

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex gap-6 p-6 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="absolute mt-1 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>

        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="ml-8 size-48 shrink-0 rounded-lg object-cover shadow-lg"
          />
        ) : (
          <div className="ml-8 flex size-48 shrink-0 items-center justify-center rounded-lg bg-muted">
            <ListMusic className="size-16 text-muted-foreground/50" />
          </div>
        )}

        <div className="flex min-w-0 flex-col justify-end gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Playlist
          </span>
          <h1 className="text-3xl font-bold tracking-tight">{playlist.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{playlist.numberOfTracks} tracks</span>
            {totalDuration > 0 && (
              <>
                <span>--</span>
                <Clock className="size-3.5" />
                <span>{formatTime(totalDuration)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Play All button */}
      {playlist.tracks.length > 0 && (
        <div className="px-6 pb-4">
          <button
            onClick={handlePlayAll}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Play className="size-4" />
            Play
          </button>
        </div>
      )}

      {/* Track list */}
      <div className="px-2 pb-6">
        <TrackList tracks={playlist.tracks} onPlay={handlePlayTrack} />
      </div>
    </div>
  );
}

function PlaylistSkeleton() {
  return (
    <div className="flex flex-1 flex-col p-6">
      <div className="flex gap-6">
        <Skeleton className="size-48 rounded-lg" />
        <div className="flex flex-col justify-end gap-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
