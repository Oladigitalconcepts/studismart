import { Home, BookOpen, Bot, GraduationCap, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

export type Screen = "home" | "materials" | "tutor" | "skills" | "profile";

const tabs: { id: Screen; label: string; icon: typeof Home; path: string }[] = [
  { id: "home", label: "Home", icon: Home, path: "/home" },
  { id: "materials", label: "Materials", icon: BookOpen, path: "/materials" },
  { id: "tutor", label: "AI Tutor", icon: Bot, path: "/tutor" },
  { id: "skills", label: "Skills", icon: GraduationCap, path: "/skills" },
  { id: "profile", label: "Profile", icon: User, path: "/profile" },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeId: Screen =
    pathname.startsWith("/tutor") ? "tutor"
    : pathname.startsWith("/skills") ? "skills"
    : pathname.startsWith("/materials") ? "materials"
    : pathname.startsWith("/profile") ? "profile"
    : "home";

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/90 backdrop-blur-xl border-t border-border z-50 safe-bottom"
      style={{ WebkitBackdropFilter: "blur(20px)" }}
    >
      <div className="grid grid-cols-5 h-16 relative">
        {tabs.map(({ id, label, icon: Icon, path }) => {
          const isActive = activeId === id;
          return (
            <button
              key={id}
              onClick={() => {
                haptic("selection");
                navigate(path);
                window.dispatchEvent(new CustomEvent("bottom-nav-reset", { detail: { tab: id } }));
              }}
              className="flex flex-col items-center justify-center gap-1 tap-scale relative outline-none"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-b-full gradient-primary animate-fade-in" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-all duration-200 ease-out",
                  isActive ? "text-primary scale-110" : "text-muted-foreground scale-100",
                )}
                strokeWidth={isActive ? 2.6 : 2}
              />
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  isActive ? "text-primary" : "text-muted-foreground",
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
