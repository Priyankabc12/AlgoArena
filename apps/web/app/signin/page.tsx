import Link from "next/link";
import { AuthCard } from "../auth-card";

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  const allowed = typeof returnTo === "string" && (
    ["/admin", "/profile", "/playground"].includes(returnTo) ||
    /^\/submissions\/[a-zA-Z0-9_-]{1,100}$/.test(returnTo)
  );
  const redirectTo = allowed ? returnTo : "/questions";

  return <main className="rx-auth-page"><Link className="rx-brand" href="/">ALGO<span>ARENA</span><b>®</b></Link><AuthCard initialMode="sign-in" redirectTo={redirectTo} /></main>;
}
