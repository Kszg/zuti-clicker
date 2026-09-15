import { ref, computed, useId, onUnmounted } from "vue";

/**
 * Shared behavior behind UnitCard's and UpgradeTile's info-button tooltip:
 * open on hover/focus of a specific anchor element, positioned via that
 * anchor's own viewport rect (so it works whether the caller is teleported,
 * inside a scrollable rail, or a mobile sheet with its own `transform`), and
 * closed on scroll/resize rather than left to go stale at a scrolled-past
 * position. Extracted from UnitCard.vue so UpgradeTile.vue doesn't have to
 * duplicate it.
 */
export function useAnchoredTooltip(width = 220) {
  const hovered = ref(false);
  const focused = ref(false);
  const visible = computed(() => hovered.value || focused.value);
  const tooltipId = useId();

  const anchorRef = ref<HTMLElement | null>(null);
  const style = ref<{ top: string; left: string } | null>(null);
  const VIEWPORT_MARGIN = 8;

  // Computed once, on open — does not track the anchor continuously (see
  // close() below for what happens if the page scrolls while it's open).
  function position(): void {
    const el = anchorRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.min(width, window.innerWidth - VIEWPORT_MARGIN * 2);
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - w - VIEWPORT_MARGIN));
    style.value = { top: `${rect.bottom + 8}px`, left: `${left}px` };
  }

  function onEnter(): void {
    hovered.value = true;
    position();
  }
  function onLeave(): void {
    hovered.value = false;
  }
  function onFocus(): void {
    focused.value = true;
    position();
  }
  function onBlur(): void {
    focused.value = false;
  }

  // A capture-phase listener catches scrolling on an ancestor's own
  // `overflow-y: auto` (the shop panel's list), which doesn't bubble to
  // window the way a normal listener would need.
  function close(): void {
    hovered.value = false;
    focused.value = false;
  }
  window.addEventListener("scroll", close, true);
  window.addEventListener("resize", close);
  onUnmounted(() => {
    window.removeEventListener("scroll", close, true);
    window.removeEventListener("resize", close);
  });

  return { anchorRef, visible, tooltipId, style, onEnter, onLeave, onFocus, onBlur };
}
