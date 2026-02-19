import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Search as SearchIcon, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 300;
const RECENT_SEARCHES_KEY = "moonsway-recent-searches";
const CURRENT_SEARCH_KEY = "moonsway-current-search";
const MAX_RECENT_QUERIES = 6;

function readRecentQueries(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function persistRecentQueries(queries: string[]): void {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(queries));
  } catch {
    // Ignore storage errors.
  }
}

function clearRecentQueriesStorage(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore storage errors.
  }
}

function persistCurrentSearch(query: string): void {
  try {
    if (!query.trim()) {
      localStorage.removeItem(CURRENT_SEARCH_KEY);
      return;
    }
    localStorage.setItem(CURRENT_SEARCH_KEY, query);
  } catch {
    // Ignore storage errors.
  }
}

export function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recentQueries, setRecentQueries] = useState<string[]>(() => readRecentQueries());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const pathParts = location.pathname.split("/");
    if (pathParts[1] === "search" && pathParts[2]) {
      const urlQuery = decodeURIComponent(pathParts[2]);
      setQuery((prev) => (prev === urlQuery ? prev : urlQuery));
      persistCurrentSearch(urlQuery);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTypingTarget) return;

      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!location.pathname.startsWith("/search")) {
      setIsLoading(false);
      return;
    }

    if (!query.trim()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      const target = `/search/${encodeURIComponent(query)}`;
      if (location.pathname !== target) {
        navigate(target);
      }
      persistCurrentSearch(query.trim());
      setIsLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, navigate, location.pathname]);

  const saveRecentQuery = (rawQuery: string) => {
    const normalized = rawQuery.trim();
    if (!normalized) return;

    setRecentQueries((prev) => {
      const next = [
        normalized,
        ...prev.filter((item) => item.toLowerCase() !== normalized.toLowerCase()),
      ].slice(0, MAX_RECENT_QUERIES);
      persistRecentQueries(next);
      return next;
    });
  };

  const handleClear = () => {
    setQuery("");
    persistCurrentSearch("");
    if (location.pathname.startsWith("/search")) {
      navigate("/search");
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = query.trim();
    if (!normalized) return;
    navigate(`/search/${encodeURIComponent(normalized)}`);
    saveRecentQuery(normalized);
    persistCurrentSearch(normalized);
    setIsLoading(false);
  };

  const handleRecentClick = (recentQuery: string) => {
    setQuery(recentQuery);
    navigate(`/search/${encodeURIComponent(recentQuery)}`);
    saveRecentQuery(recentQuery);
    persistCurrentSearch(recentQuery);
  };

  const handleClearRecentQueries = () => {
    setRecentQueries([]);
    clearRecentQueriesStorage();
  };

  return (
    <div className="flex w-full max-w-3xl flex-col gap-2">
      <form className="relative w-full" onSubmit={handleSubmit}>
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search for tracks, albums, or artists..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            persistCurrentSearch(e.target.value);
          }}
          className="h-11 rounded-xl border-border/60 bg-card/70 pl-9 pr-10"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {!isLoading && query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
        {!isLoading && !query && (
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border/80 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            /
          </kbd>
        )}
      </form>

      {!query && recentQueries.length > 0 && (
        <div className="flex flex-col gap-2 px-1">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Recent
            </span>
            <button
              type="button"
              onClick={handleClearRecentQueries}
              className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {recentQueries.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleRecentClick(item)}
                className="rounded-full border border-border/80 bg-card/70 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
