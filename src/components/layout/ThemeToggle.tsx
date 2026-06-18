"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-muted" aria-label="Toggle theme">
        <div className="w-5 h-5" />
      </button>
    );
  }

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  return (
    <button
      onClick={cycleTheme}
      className="relative p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors duration-200 btn-press"
      aria-label={`Current theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
    >
      {theme === "light" && (
        <Sun className="w-5 h-5 text-warning animate-scale-in" />
      )}
      {theme === "dark" && (
        <Moon className="w-5 h-5 text-primary animate-scale-in" />
      )}
      {theme === "system" && (
        <Monitor className="w-5 h-5 text-muted-foreground animate-scale-in" />
      )}
    </button>
  );
}
