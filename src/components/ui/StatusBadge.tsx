interface StatusBadgeProps {
  label: string;
  /** Positioning, padding, text size, border and shadow classes. */
  className?: string;
  /** Size/border classes for the pulsing dot. */
  dotClassName?: string;
}

/**
 * Pulsing "LIVE" / "UPCOMING" pill. Rendered uppercase with the secondary
 * (green) background; callers control size and placement via className.
 */
export default function StatusBadge({
  label,
  className = '',
  dotClassName = 'w-2 h-2 border border-black',
}: StatusBadgeProps) {
  return (
    <div
      className={`inline-flex items-center rounded-full bg-secondary text-black font-mono font-bold uppercase ${className}`}
    >
      <span
        className={`rounded-full bg-white pulse-live shrink-0 ${dotClassName}`}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}
