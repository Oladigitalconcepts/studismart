import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { BottomNav } from "@/components/studymind/BottomNav";
import { InstallPrompt } from "@/components/studymind/InstallPrompt";
import { OfflineBanner } from "@/components/studymind/OfflineBanner";
import { useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import {
  scheduleDailyReminder,
  computeStreak,
  checkStreakMilestone,
} from "@/lib/notifications";
import { ensureWallet } from "@/lib/coins";
import { triggerDailyLogin } from "@/lib/missions";

const HIDE_NAV_PREFIXES = ["/", "/auth", "/onboarding", "/splash"];
const isPublicQuizRoute = (path: string) => path.startsWith("/q/");

export const AppLayout = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  // (Onboarding is now triggered only after a new signup, not via auto-redirect.)

  // Bootstrap notifications on login.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("reminder_time, notify_study_reminders")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      scheduleDailyReminder(
        data?.reminder_time ?? "19:00",
        data?.notify_study_reminders ?? true,
      );
      const streak = await computeStreak();
      if (streak.current > 0) await checkStreakMilestone(streak.current);
      // Initialize coin wallet & mark daily login mission.
      await ensureWallet();
      await triggerDailyLogin();
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Route guards.
  useEffect(() => {
    if (loading) return;
    const publicRoutes = ["/", "/auth"];
    const isPublic = publicRoutes.includes(location.pathname) || isPublicQuizRoute(location.pathname);

    if (!user && !isPublic && location.pathname !== "/onboarding") {
      navigate("/", { replace: true });
      return;
    }
    if (user && publicRoutes.includes(location.pathname)) {
      navigate("/home", { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <main className="screen-shell flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </main>
    );
  }

  const hideNav =
    HIDE_NAV_PREFIXES.includes(location.pathname) || isPublicQuizRoute(location.pathname) || !user;
  const padded = !hideNav;

  return (
    <main className={padded ? "screen-shell" : "screen-shell !pb-0"}>
      {!hideNav && <OfflineBanner />}
      <div key={location.pathname} className="page-transition">
        <Outlet />
      </div>
      {!hideNav && (
        <>
          <BottomNav />
          <InstallPrompt />
        </>
      )}
    </main>
  );
};
