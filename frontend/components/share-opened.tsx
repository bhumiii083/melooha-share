"use client";

import { track } from "@/lib/api";
import { keys } from "@/lib/storage";
import { useEffect } from "react";

export function ShareOpened({ id }: { id: string }) {
  useEffect(() => {
    const userId = localStorage.getItem(keys.userId);
    void track("share_opened", userId, id);
  }, [id]);
  return null;
}
