/**
 * Tiny className combiner. Avoids adding clsx/classnames as a dependency
 * for the trivial use-cases we have today; swap to clsx later if needed.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
