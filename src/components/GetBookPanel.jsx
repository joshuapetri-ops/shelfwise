import { buildAcquireLinks } from '../lib/purchaseLinks';

export default function GetBookPanel({ book, libraryCode }) {
  const links = buildAcquireLinks(book, libraryCode);

  if (!links || links.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-gray-600">Get this book</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95"
          >
            {link.icon && <span>{link.icon}</span>}
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
