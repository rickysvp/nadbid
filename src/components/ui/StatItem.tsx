interface StatItemProps {
  label: string;
  value: string;
  /** Tailwind class controlling the value color. Defaults to the primary color. */
  valueClass?: string;
  /** "horizontal" renders "Label Value" inline; "vertical" stacks them. */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Compact label/value pair used across auction cards
 * (Followers, Holders, TVL, ...).
 */
export default function StatItem({
  label,
  value,
  valueClass = 'text-primary',
  orientation = 'horizontal',
  className = '',
}: StatItemProps) {
  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <span className="font-mono text-[11px] text-on-surface-variant uppercase font-black mb-1">
          {label}
        </span>
        <span className={`font-mono text-lg font-black ${valueClass}`}>{value}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 font-mono text-[10px] uppercase text-on-surface-variant font-bold shrink-0 ${className}`}
    >
      <span>{label}</span>
      <span className={`font-black ${valueClass}`}>{value}</span>
    </div>
  );
}
