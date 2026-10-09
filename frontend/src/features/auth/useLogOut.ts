"use client";

import { useRouter } from "next/navigation";

import { toast } from "@/components/ui";
import { useLogout } from "@/lib/api";
import { LOGIN_PATH } from "@/lib/auth";

import { authStrings } from "./strings";

/** Logs out (the API clears the session cookie), drops the cached data and opens the login page. */
export function useLogOut() {
  const router = useRouter();
  const logout = useLogout();

  const logOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => router.replace(LOGIN_PATH),
      onError: () => toast.error(authStrings.logOutFailed, { id: "log-out" }),
    });

  return { logOut, pending: logout.isPending };
}
