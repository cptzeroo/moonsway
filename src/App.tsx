function App() {
  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-60 flex-col border-r border-border bg-sidebar p-4">
          <h1 className="mb-6 text-xl font-bold tracking-tight">Moonsway</h1>
          <nav className="flex flex-col gap-1">
            <button className="rounded-md bg-accent px-3 py-2 text-left text-sm font-medium text-accent-foreground">
              Home
            </button>
            <button className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              Search
            </button>
            <button className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              Library
            </button>
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex flex-1 flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome to Moonsway
            </h2>
            <p className="mt-2 text-muted-foreground">
              Lightweight, offline-first lossless music streaming.
            </p>
          </div>
        </main>
      </div>

      {/* Player bar */}
      <footer className="flex h-20 items-center border-t border-border bg-card px-6">
        <div className="flex w-1/3 items-center gap-3">
          <div className="h-12 w-12 rounded bg-muted" />
          <div>
            <p className="text-sm font-medium">No track playing</p>
            <p className="text-xs text-muted-foreground">--</p>
          </div>
        </div>
        <div className="flex w-1/3 flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button className="text-muted-foreground hover:text-foreground">
              Prev
            </button>
            <button className="rounded-full bg-primary px-4 py-1 text-sm font-medium text-primary-foreground">
              Play
            </button>
            <button className="text-muted-foreground hover:text-foreground">
              Next
            </button>
          </div>
          <div className="h-1 w-full max-w-md rounded-full bg-muted">
            <div className="h-1 w-0 rounded-full bg-primary" />
          </div>
        </div>
        <div className="flex w-1/3 justify-end">
          <span className="text-xs text-muted-foreground">Volume</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
