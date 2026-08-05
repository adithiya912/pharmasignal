import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Returns false during SSR/first client render and true after hydration,
 * without calling setState inside an effect (which the react-hooks
 * set-state-in-effect rule flags) — used to defer theme-dependent icons
 * until the client has hydrated and next-themes knows the real theme.
 */
export function useHasMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
