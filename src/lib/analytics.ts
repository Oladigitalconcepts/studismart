// Lightweight analytics tracker for funnel events.
// Persists events to localStorage and emits a window event so any future
// provider (PostHog, GA, Segment) can subscribe without code changes.

export type AnalyticsEvent =
  | "signup_completed"
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_step_abandoned"
  | "onboarding_completed";

interface EventRecord {
  event: AnalyticsEvent;
  props?: Record<string, unknown>;
  ts: number;
}

const STORAGE_KEY = "studymind-analytics-events";
const MAX_EVENTS = 200;

function read(): EventRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function write(events: EventRecord[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(events.slice(-MAX_EVENTS)),
    );
  } catch {
    /* ignore quota errors */
  }
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  const record: EventRecord = { event, props, ts: Date.now() };
  const events = read();
  events.push(record);
  write(events);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("analytics:event", { detail: record }));
  }
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props ?? {});
  }
}

export function getEvents(): EventRecord[] {
  return read();
}

/**
 * Drop-off helpers. A "step" is abandoned when the user started it but never
 * emitted onboarding_step_completed for it before the session ended.
 */
export function computeOnboardingDropOff() {
  const events = read().filter((e) => e.event.startsWith("onboarding_"));
  const started = events.filter((e) => e.event === "onboarding_started").length;
  const completed = events.filter(
    (e) => e.event === "onboarding_completed",
  ).length;
  const perStep: Record<string, { reached: number; completed: number }> = {};
  for (const e of events) {
    const step = (e.props?.step as string) ?? "unknown";
    if (!perStep[step]) perStep[step] = { reached: 0, completed: 0 };
    if (e.event === "onboarding_step_completed") perStep[step].completed += 1;
    if (
      e.event === "onboarding_step_abandoned" ||
      e.event === "onboarding_step_completed"
    ) {
      perStep[step].reached += 1;
    }
  }
  return {
    started,
    completed,
    dropOffRate: started ? 1 - completed / started : 0,
    perStep,
  };
}
