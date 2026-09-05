import { Moon, Palette, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Theme = "dark" | "light" | "gray";

const THEMES = [
  { value: "dark", label: "Escuro", description: "Preto moderno", icon: Moon },
  { value: "light", label: "Claro", description: "Branco liquid glass", icon: Sun },
  { value: "gray", label: "Cinza", description: "Cinza liquid glass", icon: Palette },
] as const;

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme !== "light");
  root.dataset.theme = theme;
}

export function ThemePicker() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("carta-mz-theme");
    const next = saved === "light" || saved === "gray" || saved === "dark" ? saved : "dark";
    setTheme(next);
    applyTheme(next);
  }, []);

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
      <DropdownMenuContent align="end" className="liquid-glass w-52 rounded-2xl p-2">
        <p className="px-2 pb-2 pt-1 text-xs font-semibold text-muted-foreground">Tema</p>
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
                <span className="flex flex-col"><span className="font-medium">{item.label}</span><span className="text-xs text-muted-foreground">{item.description}</span></span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
