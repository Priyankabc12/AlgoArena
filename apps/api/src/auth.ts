import "dotenv/config";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { betterAuth } from "better-auth";
import { prisma } from "./prisma.js";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:4000";
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

export const auth = betterAuth({
  baseURL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [webOrigin],
  user: {
    additionalFields: {
      role: {
        type: ["user", "admin"],
        defaultValue: "user",
        input: false
      }
    }
  }
});
