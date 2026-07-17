/**
 * Haptic feedback helper (emil-design-eng: press feedback).
 * Gated by prefers-reduced-motion — never vibrate if user opted out.
 * Call on CTA tap / add-to-cart / order success.
 */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore — insecure context or unsupported
    }
  }
}
