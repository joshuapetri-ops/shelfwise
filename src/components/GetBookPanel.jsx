import { buildAcquireLinks } from '../lib/purchaseLinks';
import useSettings from '../hooks/useSettings';

export default function GetBookPanel({ book, libraryCode: libraryCodeProp }) {
  const { settings } = useSettings();
  const libraryCode = libraryCodeProp || settings.libraryCode;
  const links = buildAcquireLinks(book, libraryCode);

  if (!links || links.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium text-gray-600 dark:text-gray-400">Get this book</h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95"
          >
            {link.icon && <span>{link.icon}</span>}
            {link.label || link.name}
          </a>
        ))}
      </div>
    </div>
  );
}
