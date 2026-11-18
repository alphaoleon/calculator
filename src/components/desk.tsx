import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { OptionsBuilder } from "@/components/options-builder";
import { applyTheme, currentTheme, toggleTheme, type ThemeName } from "@/lib/theme";

export function Desk() {
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    const saved = currentTheme();
    setTheme(saved);
    if (saved !== "dark") applyTheme("dark");
    setTheme("dark");
  }, []);

  return (
    <div className="desk-shell min-h-screen bg-bg text-fg">
      <header className="pb-top">
        <div className="pb-brand">
          <span className="pb-mark" aria-hidden>P</span>
          <span className="pb-name">
            Position Builder
            <small>Options + Prop</small>
          </span>
        </div>
        <div className="pb-tools">
          <button type="button" className="pb-outline" onClick={() => setTheme(toggleTheme())}>
            {theme === "dark" ? "Hell" : "Dunkel"}
          </button>
        </div>
      </header>
      <div className="flex w-full min-w-0 flex-col gap-2 px-2 py-2">
        <Toaster
          theme={theme}
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-raised)",
              color: "var(--color-fg)",
              border: "1px solid var(--color-line)",
              boxShadow: "none",
            },
          }}
        />
        <OptionsBuilder live />
      </div>
    </div>
  );
}
