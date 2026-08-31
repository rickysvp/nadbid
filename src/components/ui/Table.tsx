import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

/**
 * 统一表格组件 — 从 StakingView/ClaimView/PointsView 提取
 * 样式：bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden
 */

export function Table({ className, children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="bg-[#161616] border border-white/[0.04] rounded-xl overflow-hidden">
      <table className={cn('w-full text-left border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn('border-b border-white/[0.08] bg-[#0f0f0f]', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableHead({ className, children, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'py-4 px-6 text-white/40 text-[9px] font-bold uppercase tracking-[0.15em]',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableBody({ className, children, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('text-[13px]', className)} {...props}>{children}</tbody>;
}

export function TableRow({ className, children, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-white/[0.02] last:border-0 hover:bg-white/[0.01] transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({ className, children, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('py-4 px-6', className)} {...props}>{children}</td>;
}

/** 空状态行 */
export function TableEmpty({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center text-white/30 text-sm font-medium">
        {message}
      </td>
    </tr>
  );
}
