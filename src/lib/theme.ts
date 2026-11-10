export const THEME_KEY = "position-builder.theme";

export type ThemeName = "dark" | "light";

const PAPER = "#f3f4f6";
const INK = "#0a0b0d";

export function currentTheme(): ThemeName {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.style.backgroundColor = theme === "light" ? PAPER : INK;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? PAPER : INK);
}

export function toggleTheme(): ThemeName {
  const next = currentTheme() === "light" ? "dark" : "light";
  applyTheme(next);
  return next;
}
