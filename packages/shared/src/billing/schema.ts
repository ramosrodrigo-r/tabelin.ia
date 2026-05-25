import { z } from "zod";

export const PLAN_IDS = ["free", "pro"] as const;
export const PLAN_CYCLES = ["monthly", "annual"] as const;
export const ENTITLEMENT_STATUS = ["active", "expired", "canceled", "pending"] as const;

export const METER_KINDS = ["tool_use", "chat_message", "upload_file"] as const;
export const USAGE_STATUS = ["reserved", "confirmed", "released"] as const;

export const BILLING_STATUS = [
  "pending",
  "approved",
  "rejected",
  "expired",
  "refunded",
  "charged_back",
  "canceled"
] as const;

export const FREE_QUOTAS = {
  tool_use: { limit: 4, windowHours: 12 },
  chat_message: { limit: 10, windowDays: 30 },
  upload_file: { limit: 5, maxSizeMB: 5 }
} as const;

export type PlanId = (typeof PLAN_IDS)[number];
export type PlanCycle = (typeof PLAN_CYCLES)[number];
export type EntitlementStatus = (typeof ENTITLEMENT_STATUS)[number];
export type MeterKind = (typeof METER_KINDS)[number];
export type UsageStatus = (typeof USAGE_STATUS)[number];
export type BillingStatus = (typeof BILLING_STATUS)[number];

export type UserEntitlement = {
  plan: PlanId;
  cycle?: PlanCycle;
  status: EntitlementStatus;
  currentPeriodEnd?: Date;
  recentlyRevoked?: boolean;
  priority?: boolean;
};

export type QuotaCheckResult =
  | { allowed: true; reservationKey: string; lastFreeUse?: boolean; priority?: boolean }
  | { allowed: false; reason: "quota_exceeded"; meterKind: MeterKind };

export type QuotaConfirmResult = { confirmed: true } | { confirmed: false; reason: string };

export type QuotaReleaseResult = { released: true } | { released: false; reason: string };

export const billingCycleSchema = z.enum(PLAN_CYCLES);

export const checkoutRequestSchema = z.object({
  cycle: billingCycleSchema,
});

export const checkoutResponseSchema = z.object({
  checkoutUrl: z.string().url(),
  externalReference: z.string(),
});
