import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = {
  variant: "professional";
  primary: string;
  appearance: "light" | "dark" | "system";
  radius: number;
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialTheme: Theme = {
  variant: "professional",
  primary: "hsl(158, 64%, 32%)", // Emerald green
  appearance: "light",
  radius: 0.75,
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

export function ThemeProvider({
  children,
  defaultTheme = initialTheme,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    // Apply theme variables
    root.style.setProperty("--primary", theme.primary);
    root.style.setProperty(
      "--radius",
      `${theme.radius}rem`
    );

    // Set color scheme
    const colorScheme = theme.appearance === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme.appearance;
    
    root.classList.remove("light", "dark");
    root.classList.add(colorScheme);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return context;
};

