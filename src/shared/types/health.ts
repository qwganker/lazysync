export type HealthStatus = "available" | "unavailable" | "skipped";

export interface HealthCheckItem {
  status: HealthStatus;
  message: string | null;
}

export interface AppHealthCheckResult {
  overallStatus: "available" | "unavailable";
  browserRuntime: HealthCheckItem;
  playwrightLaunch: HealthCheckItem;
  checkedAt: string;
}
