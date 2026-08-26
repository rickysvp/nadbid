import { Link } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE, APP_VERSION_DISPLAY } from '@/constants/app';
import { footerLinks } from '@/routes/config';

const LINK_CLASSES =
  'font-mono text-xs text-on-surface-variant hover:text-primary transition-colors opacity-80 hover:opacity-100 uppercase tracking-wider font-bold';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-container-low w-full border-t-2 border-black mt-auto">
      <div className="w-full px-container-padding py-base-unit flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto min-h-[80px]">
        <Link
          to="/"
          className="mb-4 md:mb-0 flex items-center gap-2 font-bold btn-hover"
          aria-label={APP_NAME}
        >
          <img
            src="/nadbid.png"
            alt={APP_NAME}
            className="h-6 md:h-7 w-auto object-contain drop-shadow-[0_1px_0_rgba(0,0,0,0.85)]"
          />
        </Link>

        <nav className="flex flex-wrap justify-center gap-6 mb-4 md:mb-0" aria-label="Footer">
          {footerLinks.map((link) =>
            link.external ? (
              <a
                key={link.label}
                className={LINK_CLASSES}
                href={link.href}
                target={link.href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ) : (
              <Link key={link.label} className={LINK_CLASSES} to={link.href}>
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="font-mono text-[11px] text-black/70 font-bold flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
          <span>
            © {year} {APP_NAME}.
          </span>
          <span className="text-on-surface-variant">{APP_TAGLINE}.</span>
          <span className="uppercase tracking-wider text-primary/80 border-l-2 border-black/10 pl-2 ml-0.5">
            {APP_VERSION_DISPLAY}
          </span>
        </div>
      </div>
    </footer>
  );
}
