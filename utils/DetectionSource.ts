// Describes WHO detected a crash, so every log line, server record and alert
// email can say whether it came from background detection or from the app
// being open.

/** Which pipeline fed the detector. */
export type DetectionVia =
  | "background-service" // the always-on foreground service (utils/BackgroundCrashMonitor.ts)
  | "app-foreground" //     sensors started while the app is open (utils/SensorManager.ts)
  | "manual-test"; //       the "Test the safety check" button

export type TriggerInfo = {
  via: DetectionVia;
  /** AppState at the moment the crash was detected ("active", "background", ...) */
  appState: string;
  score?: number;
  /** Human-readable evidence, e.g. "impact 9.1 g, spin 7.2 rad/s, speed 52 → 3 km/h" */
  summary?: string;
};

/** Value sent to the server. */
export type ApiSource = "background" | "app-open" | "test";

export function toApiSource(info: TriggerInfo | null | undefined): ApiSource {
  if (!info) return "app-open";
  if (info.via === "manual-test") return "test";
  return info.appState === "active" ? "app-open" : "background";
}

/** Short tag for log lines: "BACKGROUND", "APP OPEN" or "TEST". */
export function sourceTag(info: TriggerInfo | null | undefined): string {
  switch (toApiSource(info)) {
    case "background":
      return "BACKGROUND";
    case "test":
      return "TEST";
    default:
      return "APP OPEN";
  }
}

/** Long form: which pipeline, and what state the app was in. */
export function sourceDetail(info: TriggerInfo | null | undefined): string {
  if (!info) return "unknown";
  const pipe =
    info.via === "background-service"
      ? "background service"
      : info.via === "app-foreground"
      ? "in-app sensors"
      : "test button";
  return `${sourceTag(info)} · detector: ${pipe} · app state: ${info.appState}`;
}
