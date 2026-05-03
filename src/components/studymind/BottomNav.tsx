import { Home, BookOpen, FolderOpen, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export type Screen = "home" | "practice" | "materials" | "profile";

const tabs: { id: Screen; label: string; icon: typeof Home; path: string }[] = [
  { id: "home", label: "Home", icon: Home, path: "/home" },
  { id: "practice", label: "Practice", icon: BookOpen, path: "/practice" },
  { id: "materials", label: "Materials", icon: FolderOpen, path: "/materials" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeId: Screen =
    pathname.startsWith("/practice") || pathname.startsWith("/studypack")
      ? "practice"
      : pathname.startsWith("/materials")
      ? "materials"
      : pathname.startsWith("/profile")
      ? "profile"
      : "home";

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur-lg border-t border-border z-50">
      <div className="grid grid-cols-4 h-16">
        {tabs.map(({ id, label, icon: Icon, path }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-1 tap-scale relative"
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b-full gradient-primary" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
