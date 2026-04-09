"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "devhub-selected-project";
export const PROJECT_CHANGE_EVENT = "devhub-project-change";

function subscribe(callback: () => void) {
  window.addEventListener(PROJECT_CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PROJECT_CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function useProjectId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
