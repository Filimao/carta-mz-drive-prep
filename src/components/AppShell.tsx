import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Dumbbell,
  ClipboardList,
  LayoutGrid,
  XCircle,
  Star,
  BarChart3,
  LineChart,
  WifiOff,
  UserRound,
  Moon,
  Sun,
  Menu,
  Tag,
  ShieldCheck,
  Receipt,
  LogIn,
  LogOut,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { ChatBot } from "@/components/ChatBot";
import { InstallButton } from "@/components/PwaInstall";
import { ThemePicker } from "@/components/ThemePicker";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/praticar", label: "Praticar", icon: Dumbbell },
  { to: "/simulados", label: "Simulados", icon: ClipboardList },
  { to: "/categorias", label: "Categorias", icon: LayoutGrid },
  { to: "/erros", label: "Erros", icon: XCircle },
  { to: "/favoritos", label: "Favoritos", icon: Star },
  { to: "/progresso", label: "Progresso", icon: BarChart3 },
  { to: "/estatisticas", label: "Estatísticas", icon: LineChart },
  { to: "/offline", label: "Offline", icon: WifiOff },
] as const;

const BOTTOM_NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/praticar", label: "Praticar", icon: Dumbbell },
  { to: "/simulados", label: "Simulados", icon: ClipboardList },
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

function MobileMenu({
  open,
  onOpenChange,
  pathname,
  isAdmin,
  isLoggedIn,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pathname: string;
  isAdmin: boolean;
  isLoggedIn: boolean;
  onSignOut: () => void;
}) {
  const extra = [
    { to: "/precos", label: "Preços", icon: Tag },
    ...(isLoggedIn ? [{ to: "/perfil", label: "A minha conta", icon: UserRound }] : []),
    ...(isAdmin
      ? [
          { to: "/admin", label: "Admin", icon: ShieldCheck },
          { to: "/admin/pagamentos", label: "Pagamentos", icon: Receipt },
        ]
      : []),
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[85vw] max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-4 flex flex-col gap-1" aria-label="Navegação móvel">
          {[...NAV, ...extra].map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => onOpenChange(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-6 flex flex-col gap-2 border-t border-border pt-4">
          <InstallButton className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-semibold" />
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onSignOut();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-semibold"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground"
            >
              <LogIn className="h-4 w-4" /> Entrar
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

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
            <MobileMenu
              open={menuOpen}
              onOpenChange={setMenuOpen}
              pathname={pathname}
              isAdmin={session.isAdmin}
              isLoggedIn={session.userId != null}
              onSignOut={() => void signOut()}
            />
            <InstallButton className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold sm:inline-flex" />
<<<<<<< Updated upstream
<<<<<<< Updated upstream
            <ThemeToggle />
=======
            <ThemePicker />
>>>>>>> Stashed changes
=======
            <ThemePicker />
>>>>>>> Stashed changes
            <Link
              to="/precos"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              Preços
            </Link>
            {session.isAdmin && (
              <>
                <Link
                  to="/admin"
                  className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-primary sm:inline-flex"
                >
                  Admin
                </Link>
                <Link
                  to="/admin/pagamentos"
                  className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-primary lg:inline-flex"
                >
                  Pagamentos
                </Link>
              </>
            )}
            {session.userId && (
              <Link
                to="/perfil"
                aria-label="A minha conta"
                className="hidden h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-secondary sm:inline-flex"
              >
                <UserRound className="h-4 w-4" />
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
        <ul className="flex items-center justify-between px-2 gap-1">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <li key={item.to} className="flex-1">
                <Link
                  to={item.to}
                  className={`flex flex-col items-center justify-center gap-1 py-3 px-2 min-h-16 text-xs font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            >
              <Menu className="h-5 w-5" />
              Menu
            </button>
          </li>
        </ul>
      </nav>

      <ChatBot />
    </div>
  );
}
