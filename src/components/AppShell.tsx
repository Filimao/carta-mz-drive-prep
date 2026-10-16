
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
  Menu,
  Moon,
  Sun,
  Sparkles,
  Tag,
  ShieldCheck,
  Receipt,
  LogIn,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { ChatBot } from "@/components/ChatBot";
import { InstallButton } from "@/components/PwaInstall";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2 group">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary font-display text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
        MZ
      </span>

      <span className="truncate font-display text-lg sm:text-xl font-bold tracking-tight">
        Carta MZ<span className="text-primary">Quiz</span>
      </span>
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

    ...(isLoggedIn
      ? [{ to: "/perfil", label: "A minha conta", icon: UserRound }]
      : []),

    ...(isAdmin
      ? [
        { to: "/admin", label: "Admin", icon: ShieldCheck },
        {
          to: "/admin/pagamentos",
          label: "Pagamentos",
          icon: Receipt,
        },
      ]
      : []),
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[85vw] max-w-sm overflow-y-auto"
      >

        <SheetHeader>
          <SheetTitle className="font-display">
            Menu
          </SheetTitle>
        </SheetHeader>

        <nav
          className="mt-4 flex flex-col gap-1"
          aria-label="Navegação móvel"
        >
          {[...NAV, ...extra].map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => onOpenChange(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <Icon className="h-4 w-4 shrink-0" />

                <span className="truncate">
                  {item.label}
                </span>
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
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          )}
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}


type ThemeName = "light" | "dark" | "midnight";
const THEMES: { value: ThemeName; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Tema claro", icon: Sun },
  { value: "dark", label: "Tema escuro", icon: Moon },
  { value: "midnight", label: "Tema azul-noite", icon: Sparkles },
];
function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme !== "light");
  root.classList.toggle("midnight", theme === "midnight");
}
function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeName>("dark");
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem("carta-mz-theme");
    } catch {
      stored = null;
    }
    const initial: ThemeName =
      stored === "light" || stored === "dark" || stored === "midnight" ? stored : "dark";
    setTheme(initial);
    applyTheme(initial);
  }, []);
  const current = THEMES.findIndex((t) => t.value === theme);
  const next = THEMES[(current + 1) % THEMES.length]!;
  const Icon = THEMES[current === -1 ? 1 : current]!.icon;
  return (
    <button
      type="button"
      aria-label={`Mudar para ${next.label}`}
      title={`Mudar para ${next.label}`}
      onClick={() => {
        setTheme(next.value);
        applyTheme(next.value);
        try {
          window.localStorage.setItem("carta-mz-theme", next.value);
        } catch {
          /* armazenamento indisponível */
        }
      }}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl surface text-foreground transition-colors hover:bg-secondary ${className}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const session = useSession();


  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
        <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0 font-sans selection:bg-primary selection:text-primary-foreground">
      <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4 xl:gap-8">
            <Brand />

            <nav
              className="hidden items-center gap-1 lg:flex"
              aria-label="Navegação principal"
            >
              {NAV.slice(0, 5).map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition-all hover:bg-white/10 xl:px-4 ${pathname === item.to
                      ? "text-primary bg-primary/10"
                      : "text-foreground/70 hover:text-foreground"
                    }`}
                >
                  {item.label}
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-foreground/70 hover:bg-white/10 hover:text-foreground">
                  Mais <ChevronDown className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {[
                    ...NAV.slice(5),
                    { to: "/precos", label: "Preços", icon: Tag },
                    ...(session.isAdmin
                      ? [
                          { to: "/admin", label: "Admin", icon: ShieldCheck },
                          { to: "/admin/pagamentos", label: "Pagamentos", icon: Receipt },
                        ]
                      : []),
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.to} asChild>
                        <Link to={item.to} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" /> {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 mr-2">
              <ThemeToggle />
              <InstallButton className="liquid-button-outline !px-4 !py-2 !text-xs" />
            </div>

            {session.userId ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/perfil"
                  className="hidden h-10 w-10 items-center justify-center rounded-full liquid-glass text-foreground hover:bg-white/10 sm:inline-flex"
                >
                  <UserRound className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="liquid-button-outline !px-4 !py-2 !text-xs hidden sm:inline-flex"
                >
                  Sair
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="liquid-button !px-6 !py-2 !text-sm"
              >
                Entrar
              </Link>
            )}

            <MobileMenu
              open={menuOpen}
              onOpenChange={setMenuOpen}
              pathname={pathname}
              isAdmin={session.isAdmin}
              isLoggedIn={session.userId != null}
              onSignOut={() => void signOut()}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 pt-[calc(4rem+env(safe-area-inset-top))] sm:px-4 sm:pt-20 overflow-x-hidden">
        {children}
      </main>


      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        <p className="mx-auto max-w-3xl">
          Esta plataforma é uma ferramenta independente de estudo e não
          representa oficialmente o INATTER ou qualquer entidade
          governamental.
        </p>

        <p className="mt-2">
          Carta MZ Quiz — Aprende. Pratica. Passa.
        </p>
      </footer>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação inferior"
      >
        <ul className="flex items-center justify-between gap-1 px-2">
          {BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;

            return (
              <li
                key={item.to}
                className="flex-1"
              >
                <Link
                  to={item.to}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors ${active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
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
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted-foreground"
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

