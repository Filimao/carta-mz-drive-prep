import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Dumbbell,
  ClipboardList,
  LayoutGrid,
  XCircle,
  Star,
  BarChart3,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/praticar", label: "Praticar", icon: Dumbbell },
  { to: "/simulados", label: "Simulados", icon: ClipboardList },
  { to: "/categorias", label: "Categorias", icon: LayoutGrid },
  { to: "/erros", label: "Erros", icon: XCircle },
  { to: "/favoritos", label: "Favoritos", icon: Star },
  { to: "/progresso", label: "Progresso", icon: BarChart3 },
] as const;

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = window.localStorage.getItem("carta-mz-theme");
    const prefers = stored ? stored === "dark" : true;
    setDark(prefers);
    document.documentElement.classList.toggle("dark", prefers);
  }, []);
  return (
    <button
      type="button"
      aria-label={dark ? "Activar modo claro" : "Activar modo escuro"}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        window.localStorage.setItem("carta-mz-theme", next ? "dark" : "light");
      }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
        MZ
      </span>
      <span className="font-display text-base font-semibold">Carta MZ Quiz</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Brand />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === item.to
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <InstallButton className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold sm:inline-flex" />
            <ThemeToggle />
            <Link
              to="/precos"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              Preços
            </Link>
            {session.isAdmin && (
              <Link
                to="/admin"
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-primary sm:inline-flex"
              >
                Admin
              </Link>
            )}
            {session.userId ? (
              <button
                type="button"
                onClick={() => void signOut()}
                className="hidden rounded-xl border border-border px-4 py-2 text-sm font-semibold sm:inline-flex"
              >
                Sair
              </button>
            ) : (
              <Link
                to="/auth"
                className="hidden rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-flex"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
        <div className="road-stripes h-[3px] opacity-70" aria-hidden />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-3xl">
          Esta plataforma é uma ferramenta independente de estudo e não representa oficialmente o
          INATTER ou qualquer entidade governamental.
        </p>
        <p className="mt-2">Carta MZ Quiz — Aprende. Pratica. Passa.</p>
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden"
        aria-label="Navegação inferior"
      >
        <ul className="flex items-stretch justify-between px-1">
          {NAV.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
