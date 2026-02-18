export function HomePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome to Moonsway
        </h2>
        <p className="mt-2 text-muted-foreground">
          Lightweight, offline-first lossless music streaming.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Use the search to find music and start playing.
        </p>
      </div>
    </div>
  );
}
