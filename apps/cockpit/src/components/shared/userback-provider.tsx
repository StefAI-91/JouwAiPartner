"use client";

import { useEffect } from "react";
import Userback from "@userback/widget";

export function UserbackProvider() {
  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_USERBACK_TOKEN;
    if (!token) return;

    Userback(token).catch((err) => console.error("[Userback] Failed to initialize:", err));
  }, []);

  return null;
}
