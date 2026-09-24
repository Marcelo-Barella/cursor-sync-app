import { useEffect, useState } from "react";
import { API_BASE_CHANGED_EVENT, getApiBaseUrl } from "./apiBase";

export function useApiBaseUrl(): string {
  const [base, setBase] = useState(() => getApiBaseUrl());

  useEffect(() => {
    const sync = () => setBase(getApiBaseUrl());
    window.addEventListener(API_BASE_CHANGED_EVENT, sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener(API_BASE_CHANGED_EVENT, sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return base;
}
