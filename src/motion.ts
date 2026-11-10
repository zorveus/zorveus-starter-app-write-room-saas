export const motionEase = 'cubic-bezier(0.22, 1, 0.36, 1)';
const transitions = new WeakMap<HTMLElement, Animation>();

// Animate explicit editor replacements, never ordinary typing or network timing.
export function revealEdit(element: HTMLElement | null) {
  if (!element?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  transitions.get(element)?.cancel();
  const animation = element.animate([
    { opacity: 0.35, transform: 'translateY(4px)' },
    { opacity: 1, transform: 'translateY(0)' },
  ], { duration: 320, easing: motionEase });
  transitions.set(element, animation);
}
