import { onUnmounted, ref } from "vue";

// Below this, the fixed three-column shell (status rail | clicker | shop
// rail) no longer fits: the clicker collapses to near-nothing between two
// fixed-width sidebars. Matches the `@media (max-width: 759px)` breakpoint in
// App.vue/AppHeader.vue/ToastHost.vue — keep those in sync with this value.
export const COMPACT_BREAKPOINT_PX = 760;

/**
 * Reactive `isCompact` (viewport narrower than COMPACT_BREAKPOINT_PX),
 * backed by `matchMedia` so it updates live on resize/rotation without a
 * resize-event listener. Falls back to `false` when `matchMedia` is
 * unavailable (very old browsers, some non-browser test environments) rather
 * than throwing — the desktop layout is always a safe default.
 */
export function useBreakpoint(maxWidthPx: number = COMPACT_BREAKPOINT_PX) {
  const query = typeof window !== "undefined" && "matchMedia" in window
    ? window.matchMedia(`(max-width: ${maxWidthPx - 1}px)`)
    : null;

  const isCompact = ref(query?.matches ?? false);

  function onChange(e: MediaQueryListEvent) {
    isCompact.value = e.matches;
  }

  query?.addEventListener("change", onChange);
  onUnmounted(() => query?.removeEventListener("change", onChange));

  return { isCompact };
}
