/**
 * Player store -- Zustand state for audio playback, queue, and controls.
 *
 * A single HTMLAudioElement is created at module level and managed
 * entirely through the store's actions. React components subscribe
 * via `usePlayerStore()`.
 */

import { create } from "zustand";
import { getStreamUrl, getCoverUrl } from "@/lib/api/music-api";
import type { Track, StreamQuality } from "@/types/music";

// -- Types --

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  // Queue
  queue: Track[];
  shuffledQueue: Track[];
  originalQueue: Track[];
  currentIndex: number;
  shuffleActive: boolean;
  repeatMode: RepeatMode;

  // Current track
  currentTrack: Track | null;
  streamUrl: string | null;

  // Playback
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;

  // Volume
  volume: number;
  isMuted: boolean;

  // Quality
  quality: StreamQuality;
}

interface PlayerActions {
  // Playback
  playTrack: (track: Track, queue?: Track[]) => Promise<void>;
  playQueue: (tracks: Track[], startIndex?: number) => Promise<void>;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrev: () => void;
  seek: (time: number) => void;

  // Volume
  setVolume: (vol: number) => void;
  toggleMute: () => void;

  // Queue
  addToQueue: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;

  // Shuffle / Repeat
  toggleShuffle: () => void;
  cycleRepeat: () => void;
}

// -- Audio element (singleton) --

const audio = new Audio();
audio.preload = "auto";

// -- Shuffle utility --

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// -- Store --

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  (set, get) => {
    // -- Internal helpers --

    function activeQueue(): Track[] {
      const state = get();
      return state.shuffleActive ? state.shuffledQueue : state.queue;
    }

    async function loadAndPlay(track: Track): Promise<void> {
      set({ isLoading: true, currentTrack: track, streamUrl: null });

      // Update document title
      document.title = `${track.title} - ${track.artist.name} | Moonsway`;

      // Update Media Session
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist.name,
          album: track.album?.title ?? "",
          artwork: track.album?.cover
            ? [
                { src: getCoverUrl(track.album.cover, "96"), sizes: "96x96" },
                { src: getCoverUrl(track.album.cover, "320"), sizes: "320x320" },
                { src: getCoverUrl(track.album.cover, "640"), sizes: "640x640" },
              ]
            : [],
        });
      }

      try {
        const url = await getStreamUrl(track.id, get().quality);
        audio.src = url;
        set({ streamUrl: url });

        await new Promise<void>((resolve, reject) => {
          const onCanPlay = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("Audio load error"));
          };
          const cleanup = () => {
            audio.removeEventListener("canplay", onCanPlay);
            audio.removeEventListener("error", onError);
          };
          audio.addEventListener("canplay", onCanPlay, { once: true });
          audio.addEventListener("error", onError, { once: true });
        });

        await audio.play();
        set({ isPlaying: true, isLoading: false });
      } catch (error) {
        console.error("[Player] Failed to play track:", error);
        set({ isLoading: false, isPlaying: false });

        // Try fallback to LOSSLESS if hi-res failed
        const state = get();
        if (state.quality === "HI_RES_LOSSLESS") {
          try {
            const url = await getStreamUrl(track.id, "LOSSLESS");
            audio.src = url;
            set({ streamUrl: url });
            await audio.play();
            set({ isPlaying: true });
          } catch {
            console.error("[Player] Fallback to LOSSLESS also failed");
          }
        }
      }
    }

    // -- Wire audio element events --

    audio.addEventListener("timeupdate", () => {
      set({ currentTime: audio.currentTime });
    });

    audio.addEventListener("loadedmetadata", () => {
      set({ duration: audio.duration });
    });

    audio.addEventListener("ended", () => {
      get().playNext();
    });

    audio.addEventListener("play", () => {
      set({ isPlaying: true });
    });

    audio.addEventListener("pause", () => {
      set({ isPlaying: false });
    });

    // -- Media Session controls --

    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", () => get().togglePlayPause());
      navigator.mediaSession.setActionHandler("pause", () => get().togglePlayPause());
      navigator.mediaSession.setActionHandler("previoustrack", () => get().playPrev());
      navigator.mediaSession.setActionHandler("nexttrack", () => get().playNext());
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null) get().seek(details.seekTime);
      });
    }

    // -- Initial state --

    return {
      queue: [],
      shuffledQueue: [],
      originalQueue: [],
      currentIndex: -1,
      shuffleActive: false,
      repeatMode: "off",

      currentTrack: null,
      streamUrl: null,

      isPlaying: false,
      isLoading: false,
      duration: 0,
      currentTime: 0,

      volume: 1,
      isMuted: false,

      quality: "HI_RES_LOSSLESS",

      // -- Actions --

      async playTrack(track, queue) {
        const newQueue = queue ?? [track];
        const index = queue ? newQueue.findIndex((t) => t.id === track.id) : 0;

        set({
          queue: newQueue,
          originalQueue: newQueue,
          shuffledQueue: [],
          shuffleActive: false,
          currentIndex: index >= 0 ? index : 0,
        });

        await loadAndPlay(track);
      },

      async playQueue(tracks, startIndex = 0) {
        if (tracks.length === 0) return;

        const idx = Math.min(startIndex, tracks.length - 1);
        set({
          queue: tracks,
          originalQueue: tracks,
          shuffledQueue: [],
          shuffleActive: false,
          currentIndex: idx,
        });

        await loadAndPlay(tracks[idx]);
      },

      togglePlayPause() {
        if (audio.src) {
          if (audio.paused) {
            audio.play();
          } else {
            audio.pause();
          }
        }
      },

      playNext() {
        const state = get();
        const q = activeQueue();
        if (q.length === 0) return;

        if (state.repeatMode === "one") {
          audio.currentTime = 0;
          audio.play();
          return;
        }

        let nextIndex = state.currentIndex + 1;

        if (nextIndex >= q.length) {
          if (state.repeatMode === "all") {
            nextIndex = 0;
          } else {
            // End of queue, no repeat
            set({ isPlaying: false, currentTime: 0 });
            audio.pause();
            audio.currentTime = 0;
            document.title = "Moonsway";
            return;
          }
        }

        set({ currentIndex: nextIndex });
        loadAndPlay(q[nextIndex]);
      },

      playPrev() {
        // If more than 3 seconds in, restart current track
        if (audio.currentTime > 3) {
          audio.currentTime = 0;
          return;
        }

        const state = get();
        const q = activeQueue();
        if (q.length === 0) return;

        let prevIndex = state.currentIndex - 1;
        if (prevIndex < 0) {
          if (state.repeatMode === "all") {
            prevIndex = q.length - 1;
          } else {
            prevIndex = 0;
          }
        }

        set({ currentIndex: prevIndex });
        loadAndPlay(q[prevIndex]);
      },

      seek(time) {
        audio.currentTime = time;
        set({ currentTime: time });
      },

      setVolume(vol) {
        const clamped = Math.max(0, Math.min(1, vol));
        audio.volume = clamped;
        set({ volume: clamped, isMuted: clamped === 0 });
      },

      toggleMute() {
        const state = get();
        if (state.isMuted) {
          audio.volume = state.volume > 0 ? state.volume : 0.5;
          set({ isMuted: false, volume: audio.volume });
        } else {
          audio.volume = 0;
          set({ isMuted: true });
        }
      },

      addToQueue(tracks) {
        const state = get();
        const newQueue = [...state.queue, ...tracks];
        set({ queue: newQueue, originalQueue: newQueue });

        if (state.shuffleActive) {
          set({ shuffledQueue: [...state.shuffledQueue, ...tracks] });
        }

        // If nothing is playing, start
        if (!state.currentTrack && tracks.length > 0) {
          set({ currentIndex: newQueue.length - tracks.length });
          loadAndPlay(tracks[0]);
        }
      },

      removeFromQueue(index) {
        const state = get();
        const q = [...state.queue];
        q.splice(index, 1);

        let newIndex = state.currentIndex;
        if (index < newIndex) {
          newIndex--;
        } else if (index === newIndex) {
          newIndex = Math.min(newIndex, q.length - 1);
        }

        set({ queue: q, originalQueue: q, currentIndex: newIndex });
      },

      clearQueue() {
        audio.pause();
        audio.src = "";
        set({
          queue: [],
          shuffledQueue: [],
          originalQueue: [],
          currentIndex: -1,
          currentTrack: null,
          streamUrl: null,
          isPlaying: false,
          currentTime: 0,
          duration: 0,
        });
        document.title = "Moonsway";
      },

      toggleShuffle() {
        const state = get();
        if (state.shuffleActive) {
          // Turn off -- restore original order, find current track
          const currentTrack = state.currentTrack;
          const originalIndex = currentTrack
            ? state.originalQueue.findIndex((t) => t.id === currentTrack.id)
            : 0;
          set({
            shuffleActive: false,
            queue: state.originalQueue,
            shuffledQueue: [],
            currentIndex: originalIndex >= 0 ? originalIndex : 0,
          });
        } else {
          // Turn on -- shuffle, keep current track first
          const q = state.queue;
          const current = q[state.currentIndex];
          const rest = q.filter((_, i) => i !== state.currentIndex);
          const shuffled = current ? [current, ...shuffleArray(rest)] : shuffleArray(q);

          set({
            shuffleActive: true,
            originalQueue: [...q],
            shuffledQueue: shuffled,
            currentIndex: 0,
          });
        }
      },

      cycleRepeat() {
        const state = get();
        const modes: RepeatMode[] = ["off", "all", "one"];
        const currentIdx = modes.indexOf(state.repeatMode);
        const next = modes[(currentIdx + 1) % modes.length];
        set({ repeatMode: next });
      },
    };
  }
);
