import { cache } from "react";

import { getCurrentUser } from "./auth/session";

export const getCachedUser = cache(getCurrentUser);
