"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

const USER_SYNC_KEY = "vital:user-sync";

export default function UserSync() {
  const { isLoaded: authLoaded, isSignedIn, getToken, userId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const alreadySyncedRef = useRef<string | null>(null);

  useEffect(() => {
    const syncUser = async () => {
      if (!authLoaded || !userLoaded || !isSignedIn || !userId) return;
      if (alreadySyncedRef.current === userId) return;
      if (typeof window !== "undefined" && window.sessionStorage.getItem(USER_SYNC_KEY) === userId) {
        alreadySyncedRef.current = userId;
        return;
      }

      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) return;

      const token = await getToken();
      if (!token) return;

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005";

      try {
        const response = await fetch(`${apiBase}/api/users/submitUser`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email }),
        });

        if (response.ok) {
          alreadySyncedRef.current = userId;
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(USER_SYNC_KEY, userId);
          }
        }
      } catch (error) {
        console.error('Failed to sync user:', error);
      }
    };

    void syncUser();
  }, [authLoaded, userLoaded, isSignedIn, userId, user, getToken]);

  return null;
}
