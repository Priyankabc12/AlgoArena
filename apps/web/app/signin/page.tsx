import Link from "next/link";
import { AuthCard } from "../auth-card";

export default function SignInPage() {
  return <main className="rx-auth-page"><Link className="rx-brand" href="/">ALGO<span>ARENA</span><b>®</b></Link><AuthCard initialMode="sign-in" /></main>;
}
