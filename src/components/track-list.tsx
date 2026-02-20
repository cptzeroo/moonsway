import { useMemo, useState } from "react";
import { Play, Pause, Heart } from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";
import { useLibraryStore } from "@/stores/library-store";
import { getCoverUrl } from "@/lib/api/music-api";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/music";

interface TrackListProps {
  tracks: Track[];
  onPlay: (track: Track, index: number) => void;
}

export function TrackList({ tracks, onPlay }: TrackListProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const favoriteTracks = useLibraryStore((s) => s.favoriteTracks);
  const toggleFavoriteTrack = useLibraryStore((s) => s.toggleFavoriteTrack);
  const [failedCoverIds, setFailedCoverIds] = useState<Set<string>>(
    () => new Set()
  );
  const favoriteTrackIds = useMemo(
    () => new Set(favoriteTracks.map((track) => track.id)),
    [favoriteTracks]
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_1fr_2rem_4rem] items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="text-center">#</span>
        <span>Title</span>
        <span>Album</span>
        <span />
        <span className="text-right">Time</span>
      </div>

      {/* Rows */}
      {tracks.map((track, index) => {
        const isCurrent = currentTrack?.id === track.id;
        const isFav = favoriteTrackIds.has(track.id);
        const coverUrl = track.album?.cover
          ? getCoverUrl(track.album.cover, "320")
          : "";
        const canShowCover = Boolean(coverUrl) && !failedCoverIds.has(track.id);

        return (
          <div
            key={`${track.id}-${index}`}
            className={cn(
              "group grid grid-cols-[2rem_1fr_1fr_2rem_4rem] items-center gap-3 rounded-md px-4 py-2 transition-colors hover:bg-accent/50",
              isCurrent && "bg-accent/30"
            )}
          >
            {/* Number / play icon */}
            <button
              onClick={() => onPlay(track, index)}
              className="flex items-center justify-center text-sm text-muted-foreground"
            >
              {isCurrent && isPlaying ? (
                <Pause className="size-3.5 text-primary" />
              ) : (
                <span className="group-hover:hidden">
                  {isCurrent ? (
                    <Play className="size-3.5 text-primary" />
                  ) : (
                    index + 1
                  )}
                </span>
              )}
              {!isCurrent && (
                <Play className="hidden size-3.5 group-hover:block" />
              )}
            </button>

            {/* Title + artist */}
            <button
              onClick={() => onPlay(track, index)}
              className="flex min-w-0 items-center gap-3 text-left"
            >
              {canShowCover ? (
                <img
                  src={coverUrl}
                  alt=""
                  className="size-8 shrink-0 rounded object-cover"
                  loading="lazy"
                  onError={() => {
                    setFailedCoverIds((prev) => {
                      if (prev.has(track.id)) return prev;
                      const next = new Set(prev);
                      next.add(track.id);
                      return next;
                    });
                  }}
                />
              ) : (
                <div className="size-8 shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    isCurrent && "text-primary"
                  )}
                >
                  {track.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist?.name ?? "Unknown Artist"}
                </p>
              </div>
            </button>

            {/* Album */}
            <span className="truncate text-sm text-muted-foreground">
              {track.album?.title ?? ""}
            </span>

            {/* Favorite */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavoriteTrack(track);
              }}
              className={cn(
                "flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100",
                isFav && "opacity-100"
              )}
            >
              <Heart
                className={cn(
                  "size-3.5 transition-colors",
                  isFav
                    ? "fill-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              />
            </button>

            {/* Duration */}
            <span className="text-right text-sm tabular-nums text-muted-foreground">
              {formatTime(track.duration)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
