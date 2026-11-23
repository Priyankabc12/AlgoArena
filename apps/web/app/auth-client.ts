import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, oauthPopupClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
  plugins: [oauthPopupClient(), inferAdditionalFields({ user: { role: { type: ["user", "admin"], input: false } } })]
});
