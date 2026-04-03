import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ep-theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("ep-theme", theme);
  }, [theme]);

  const toggle = () => setTheme(prev => prev === "dark" ? "light" : "dark");

  return (
    <button
      onClick={toggle}
      className={cn(
        "relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-muted-foreground/60 hover:text-foreground hover:bg-muted/30 transition-all duration-200",
        className
      )}
      title={theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro"}
    >
      {theme === "dark" ? (
        <Sun className="h-3.5 w-3.5" />
      ) : (
        <Moon className="h-3.5 w-3.5" />
      )}
      <span>{theme === "dark" ? "Chiaro" : "Scuro"}</span>
    </button>
  );
}
