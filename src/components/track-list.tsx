import { Play, Pause } from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";
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

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="grid grid-cols-[2rem_1fr_1fr_4rem] items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="text-center">#</span>
        <span>Title</span>
        <span>Album</span>
        <span className="text-right">Time</span>
      </div>

      {/* Rows */}
      {tracks.map((track, index) => {
        const isCurrent = currentTrack?.id === track.id;
        const coverUrl = track.album?.cover
          ? getCoverUrl(track.album.cover, "40")
          : "";

        return (
          <button
            key={`${track.id}-${index}`}
            onClick={() => onPlay(track, index)}
            className={cn(
              "group grid grid-cols-[2rem_1fr_1fr_4rem] items-center gap-3 rounded-md px-4 py-2 text-left transition-colors hover:bg-accent/50",
              isCurrent && "bg-accent/30"
            )}
          >
            {/* Number / play icon */}
            <span className="flex items-center justify-center text-sm text-muted-foreground">
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
            </span>

            {/* Title + artist */}
            <div className="flex min-w-0 items-center gap-3">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt=""
                  className="size-8 shrink-0 rounded object-cover"
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
            </div>

            {/* Album */}
            <span className="truncate text-sm text-muted-foreground">
              {track.album?.title ?? ""}
            </span>

            {/* Duration */}
            <span className="text-right text-sm tabular-nums text-muted-foreground">
              {formatTime(track.duration)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
