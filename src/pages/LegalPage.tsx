import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { ROUTES } from '../config/routes';

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalPageProps {
  /** 页面标题 */
  title: string;
  /** 文档编号/英文名 */
  docName: string;
  /** 最后更新日期 */
  updated: string;
  /** 分区内容 */
  sections: LegalSection[];
}

/**
 * 法律页通用布局 — Terms / Privacy / Risk 共用
 * 粗野风（nb-card 硬边框 + 品牌色），正文可读优先
 */
export default function LegalPage({ title, docName, updated, sections }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-6 pt-24 pb-24 text-white">
      <Link
        to={ROUTES.HOME}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>

      <div className="nb-card mt-6 p-8 md:p-12">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-white/10 bg-[#9333ea] shadow-md">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#ccff00]">{docName}</div>
            <h1 className="mt-1 text-3xl md:text-4xl font-black tracking-tighter">{title}</h1>
            <p className="mt-2 text-xs text-white/40">Last updated: {updated}</p>
          </div>
        </div>

        <div className="mt-10 space-y-9">
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-lg font-black tracking-tight">{s.heading}</h2>
              <div className="mt-3 space-y-3">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-white/70">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
