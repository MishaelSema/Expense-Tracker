"use client";

import { useTheme } from "@/components/theme-provider";
import { SunIcon, MoonIcon } from "@/components/ui/icons";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={className}
      aria-label={theme === "dark" ? "Switch to light appearance" : "Switch to dark appearance"}
      title={theme === "dark" ? "Light appearance" : "Dark appearance"}
    >
      {theme === "dark" ? (
        <SunIcon width={19} height={19} />
      ) : (
        <MoonIcon width={19} height={19} />
      )}
    </button>
  );
}
