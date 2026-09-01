interface StatDividerProps {
  className?: string;
}

/** Thin vertical divider rendered between adjacent StatItem entries. */
export default function StatDivider({ className = 'h-3' }: StatDividerProps) {
  return <div className={`w-[2px] bg-black/10 ${className}`} aria-hidden="true" />;
}
