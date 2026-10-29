import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { HydraWizard } from "@/components/hydra-wizard";
import { useBook } from "@/lib/book-store";
import { applyTheme, currentTheme, toggleTheme, type ThemeName } from "@/lib/theme";

export function Desk() {
  const hydrate = useBook((state) => state.hydrate);
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    hydrate();
    const saved = currentTheme();
    setTheme(saved);
    if (saved !== "dark") applyTheme("dark");
    setTheme("dark");
  }, [hydrate]);

  return (
    <div className="desk-shell min-h-screen bg-bg text-fg">
      <div className="relative z-10 flex min-h-screen w-full min-w-0 flex-col gap-3 px-3 py-3 lg:px-5 lg:py-5">
        <Toaster
          theme={theme}
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--color-raised)",
              color: "var(--color-fg)",
              border: "none",
              boxShadow: "var(--shadow-card)",
            },
          }}
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="h-9 rounded-full px-3 text-xs text-muted"
            onClick={() => setTheme(toggleTheme())}
          >
            {theme === "dark" ? "Hell" : "Dunkel"}
          </button>
        </div>
        <HydraWizard />
      </div>
    </div>
  );
}
