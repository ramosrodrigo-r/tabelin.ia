import { cache } from "react";

import { getCurrentUser } from "./auth/session";
import { getUserEntitlement } from "./billing/entitlements";

export const getCachedUser = cache(getCurrentUser);
export const getCachedEntitlement = cache(getUserEntitlement);
