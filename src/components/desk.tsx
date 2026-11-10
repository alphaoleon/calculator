import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { HydraWizard } from "@/components/hydra-wizard";
import { OptionsBuilder } from "@/components/options-builder";
import { useBook } from "@/lib/book-store";
import { applyTheme, currentTheme, toggleTheme, type ThemeName } from "@/lib/theme";

type DeskMode = "perp" | "options";

export function Desk() {
  const hydrate = useBook((state) => state.hydrate);
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [mode, setMode] = useState<DeskMode>("perp");

  useEffect(() => {
    hydrate();
    const saved = currentTheme();
    setTheme(saved);
    if (saved !== "dark") applyTheme("dark");
    setTheme("dark");
  }, [hydrate]);

  return (
    <div className="desk-shell min-h-screen bg-bg text-fg">
      <header className="pb-top">
        <div className="pb-brand">
          <span className="pb-mark" aria-hidden>P</span>
          <span className="pb-name">
            Position Builder
            <small>Simulation</small>
          </span>
        </div>
        <div role="tablist" aria-label="Modus" className="pb-tabs">
          <TabButton active={mode === "perp"} controls="panel-perp" title="Hydra Perp-Loop" meta="Funded vs. Evals" onClick={() => setMode("perp")} />
          <TabButton active={mode === "options"} controls="panel-options" title="Options + Prop" meta="Live-WS" onClick={() => setMode("options")} />
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
        <div id="panel-perp" role="tabpanel" hidden={mode !== "perp"}>
          <HydraWizard />
        </div>
        <div id="panel-options" role="tabpanel" hidden={mode !== "options"}>
          <OptionsBuilder live={mode === "options"} />
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  controls,
  title,
  meta,
  onClick,
}: {
  active: boolean;
  controls: string;
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button type="button" role="tab" aria-selected={active} aria-controls={controls} className="pb-tab" onClick={onClick}>
      <strong>{title}</strong>
      <small>{meta}</small>
    </button>
  );
}
