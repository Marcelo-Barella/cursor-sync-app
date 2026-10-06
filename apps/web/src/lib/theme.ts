export const THEME_STORAGE_KEY = "cursor-sync-theme";

export type ThemePreference = "light" | "dark" | "system";

export function readThemePreference(
  storage: Storage = localStorage
): ThemePreference | null {
  const raw = storage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") {
    return raw;
  }
  return null;
}

export function saveThemePreference(
  theme: ThemePreference,
  storage: Storage = localStorage
): void {
  storage.setItem(THEME_STORAGE_KEY, theme);
}

export function applyThemePreference(
  storage: Storage = localStorage,
  root: HTMLElement = document.documentElement
): void {
  const theme = readThemePreference(storage) ?? "system";
  root.dataset.theme = theme;
}
