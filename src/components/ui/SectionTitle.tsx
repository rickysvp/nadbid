import type { LucideIcon } from 'lucide-react';

interface SectionTitleProps {
  icon: LucideIcon;
  iconClassName: string;
  title: string;
  /** When provided, renders the count in a sticker-style chip. */
  count?: number;
}

/** Section heading with icon and optional count chip. */
export default function SectionTitle({
  icon: Icon,
  iconClassName,
  title,
  count,
}: SectionTitleProps) {
  return (
    <h2 className="font-display text-3xl font-bold text-on-surface flex items-center gap-2">
      <Icon className={iconClassName} />
      {title}
      {count !== undefined && (
        <span className="ml-2 font-mono text-xl bg-primary-container border-2 border-black px-3 py-1 rounded-full shadow-neo-sm">
          {count}
        </span>
      )}
    </h2>
  );
}
