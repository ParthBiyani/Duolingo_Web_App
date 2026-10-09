import type { Metadata } from "next";

import { LoginScreen } from "@/features/auth/LoginScreen";
import { authStrings } from "@/features/auth/strings";

export const metadata: Metadata = { title: `${authStrings.pageTitle} - Duolingo` };

export default function LoginPage() {
  return <LoginScreen />;
}
