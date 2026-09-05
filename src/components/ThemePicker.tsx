import { Moon, Palette, Sparkles, Sun, Sunset, Waves } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "light" | "dark" | "ocean" | "aurora" | "sunset";

const THEMES: { value: Theme; label: string; description: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", description: "Limpo e luminoso", icon: Sun },
  { value: "dark", label: "Escuro", description: "Azul profundo", icon: Moon },
  { value: "ocean", label: "Oceano", description: "Azul-petróleo", icon: Waves },
  { value: "aurora", label: "Aurora", description: "Violeta e azul", icon: Sparkles },
  { value: "sunset", label: "Pôr do sol", description: "Âmbar e ameixa", icon: Sunset },
];

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme !== "light");
  root.dataset.theme = theme;
}

export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem("carta-mz-theme") as Theme | null;
    const next = THEMES.some((item) => item.value === stored) ? stored! : "dark";
    setTheme(next);
    applyTheme(next);
  }, []);

  const active = THEMES.find((item) => item.value === theme) ?? THEMES[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Escolher tema"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-secondary"
        >
          <Palette className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="liquid-glass w-56 rounded-2xl p-2">
        <DropdownMenuLabel className="px-2 pt-2 font-display">Aparência</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs text-muted-foreground">Escolha o seu ambiente de estudo.</p>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            const next = value as Theme;
            setTheme(next);
            applyTheme(next);
            window.localStorage.setItem("carta-mz-theme", next);
          }}
        >
          {THEMES.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuRadioItem key={item.value} value={item.value} className="rounded-xl py-2.5">
                <Icon className="mr-2 h-4 w-4 text-primary" />
                <span className="flex flex-col">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
