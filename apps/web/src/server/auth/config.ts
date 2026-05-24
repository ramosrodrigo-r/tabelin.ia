import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";

import { prisma } from "@/server/db/client";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      const recipient = user.email;
      console.info(`Password reset link for ${recipient}: ${url}`);
    }
  },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"]
});

