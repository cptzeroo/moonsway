import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Loader2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/stores/player-store";
import { getCoverUrl } from "@/lib/api/music-api";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isLoading = usePlayerStore((s) => s.isLoading);
  const duration = usePlayerStore((s) => s.duration);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const shuffleActive = usePlayerStore((s) => s.shuffleActive);
  const repeatMode = usePlayerStore((s) => s.repeatMode);

  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrev = usePlayerStore((s) => s.playPrev);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);

  const coverUrl = currentTrack?.album?.cover
    ? getCoverUrl(currentTrack.album.cover, "80")
    : "";

  const VolumeIcon = isMuted || volume === 0
    ? VolumeX
    : volume < 0.5
      ? Volume1
      : Volume2;

  const RepeatIcon = repeatMode === "one" ? Repeat1 : Repeat;

  return (
    <footer className="flex h-20 items-center border-t border-border bg-card px-4">
      {/* Left: track info */}
      <div className="flex w-1/3 min-w-0 items-center gap-3">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded bg-muted" />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {currentTrack?.title ?? "No track playing"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {currentTrack?.artist?.name ?? "--"}
          </p>
        </div>
      </div>

      {/* Center: controls + progress */}
      <div className="flex w-1/3 flex-col items-center gap-0.5">
        {/* Transport controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={toggleShuffle}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              shuffleActive && "text-primary"
            )}
          >
            <Shuffle className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={playPrev}
            className="text-muted-foreground hover:text-foreground"
          >
            <SkipBack className="size-4" />
          </Button>

          <Button
            variant="default"
            size="icon-sm"
            className="rounded-full"
            onClick={togglePlayPause}
            disabled={!currentTrack && !isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={playNext}
            className="text-muted-foreground hover:text-foreground"
          >
            <SkipForward className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={cycleRepeat}
            className={cn(
              "text-muted-foreground hover:text-foreground",
              repeatMode !== "off" && "text-primary"
            )}
          >
            <RepeatIcon className="size-3.5" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="flex w-full max-w-md items-center gap-2">
          <span className="w-10 text-right text-[10px] tabular-nums text-muted-foreground">
            {formatTime(currentTime)}
          </span>
          <Slider
            min={0}
            max={duration || 1}
            step={0.1}
            value={[currentTime]}
            onValueChange={([val]) => seek(val)}
            className="flex-1"
          />
          <span className="w-10 text-[10px] tabular-nums text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Right: volume */}
      <div className="flex w-1/3 items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleMute}
          className="text-muted-foreground hover:text-foreground"
        >
          <VolumeIcon className="size-3.5" />
        </Button>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[isMuted ? 0 : volume]}
          onValueChange={([val]) => setVolume(val)}
          className="w-24"
        />
      </div>
    </footer>
  );
}
