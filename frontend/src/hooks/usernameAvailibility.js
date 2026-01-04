import { useState, useRef, useCallback, useEffect } from "react";
import api from "../api/axiosCongfig.js";

const DEBOUNCE_DELAY = 2000;

export function useUsernameAvailability() {
  const [status, setStatus] = useState(null);
  // null | "checking" | "available" | "taken"

  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Pure API logic (no debounce)
  const checkUsernameAvailability = useCallback(async (username) => {
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await api.get("/auth/check-availability", {
        params: { username },
        signal: controller.signal,
      });

      setStatus(res.data.usernameAvailability ? "available" : "taken");
    } catch (err) {
      if (err.name === "CanceledError" || err.code === "ERR_CANCELED") {
        return;
      }
      setStatus(null);
    }
  }, []);

  // Debounce wrapper (timing only)
  const debouncedCheckUsername = useCallback(
    (username) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setStatus("checking");

      debounceTimerRef.current = setTimeout(() => {
        checkUsernameAvailability(username);
      }, DEBOUNCE_DELAY);
    },
    [checkUsernameAvailability]
  );

  // Reset helper
  const reset = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus(null);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    status,
    checkUsername: debouncedCheckUsername,
    reset,
  };
}
