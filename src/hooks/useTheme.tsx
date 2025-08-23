import { useState, useEffect } from "react";
import { useUserSettings } from "./useUserSettings";

export type Theme = "light" | "dark" | "system";

export const useTheme = () => {
  const { settings, updateSetting } = useUserSettings();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    if (settings?.theme) {
      setTheme(settings.theme as Theme);
    }
  }, [settings]);

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (newTheme: Theme) => {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      const effectiveTheme = newTheme === "system" ? systemTheme : newTheme;
      
      root.classList.remove("light", "dark");
      root.classList.add(effectiveTheme);
    };

    applyTheme(theme);

    // Listen for system theme changes when using system theme
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme(theme);
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const setThemeAndSave = async (newTheme: Theme) => {
    setTheme(newTheme);
    await updateSetting("theme", newTheme);
  };

  return { theme, setTheme: setThemeAndSave };
};