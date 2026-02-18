import { useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router";
import { Home, Search, Library } from "lucide-react";
import { ensureCollections } from "@/lib/pb-setup";
import { PlayerBar } from "@/components/player-bar";
import { HomePage } from "@/pages/home";
import { SearchPage } from "@/pages/search";
import { cn } from "@/lib/utils";

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  );
}

function AppLayout() {
  useEffect(() => {
    ensureCollections();
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {/* Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-sidebar p-4">
          <h1 className="mb-6 text-xl font-bold tracking-tight">Moonsway</h1>
          <nav className="flex flex-col gap-1">
            <NavItem to="/" icon={Home} label="Home" />
            <NavItem to="/search" icon={Search} label="Search" />
            <NavItem to="/library" icon={Library} label="Library" />
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Player bar */}
      <PlayerBar />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
