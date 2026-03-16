import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, ArrowLeft, Upload, Search, Check, Users, Globe } from 'lucide-react';
import useBooks from '../hooks/useBooks';
import useSettings from '../hooks/useSettings';
import { autoImport, enrichCovers } from '../lib/importers';
import { mockUsers, mockLibraries } from '../lib/mockData';
import Avatar from '../components/ui/Avatar';
import Button from '../components/ui/Button';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'hi', label: 'Hindi' },
  { value: 'nl', label: 'Dutch' },
  { value: 'sv', label: 'Swedish' },
  { value: 'pl', label: 'Polish' },
];

const PLATFORMS = [
  { id: 'goodreads', label: 'Goodreads' },
  { id: 'storygraph', label: 'StoryGraph' },
  { id: 'librarything', label: 'LibraryThing' },
  { id: 'openlibrary', label: 'Open Library' },
  { id: 'calibre', label: 'Calibre' },
];

const PLATFORM_INSTRUCTIONS = {
  goodreads: 'Go to My Books \u2192 Import/Export \u2192 Export Library',
  storygraph: 'Go to Settings \u2192 Export \u2192 Download CSV',
  librarything: 'Go to More \u2192 Import/Export \u2192 Export as CSV/TSV',
  openlibrary: 'Go to My Books \u2192 Export \u2192 Download CSV',
  calibre: 'In Calibre, select all \u2192 Export \u2192 CSV',
};

/* ─── Progress Dots ─────────────────────────────────────────────── */

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2.5 rounded-full transition-all duration-300 ${
            i + 1 === current
              ? 'w-8 bg-indigo-600 dark:bg-indigo-400'
              : i + 1 < current
                ? 'w-2.5 bg-indigo-400 dark:bg-indigo-500'
                : 'w-2.5 bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
}

/* ─── Step 1 — Welcome ──────────────────────────────────────────── */

function StepWelcome({ onCreateAccount, onSignIn }) {
  return (
    <div className="flex flex-col items-center text-center">
      <BookOpen className="w-20 h-20 text-indigo-600 dark:text-indigo-400 mb-6" strokeWidth={1.5} />
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Shelfwise</h1>
      <p className="text-lg text-gray-500 dark:text-gray-400 mb-2 max-w-md">
        An open social app for book lovers.
      </p>
      <p className="text-base text-gray-400 dark:text-gray-500 mb-10 max-w-md">
        Track what you read. Discover what&apos;s next.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button size="lg" className="w-full" onClick={onCreateAccount}>
          Create Account
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Button size="lg" variant="secondary" className="w-full" onClick={onSignIn}>
          Sign In
        </Button>
      </div>
      <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">Powered by the AT Protocol</p>
      <p className="mt-2 text-[11px] text-gray-300 dark:text-gray-600">
        Vibecoded by Josh Petri with the help of Claude
      </p>
    </div>
  );
}

/* ─── Step 2 — Account Setup ────────────────────────────────────── */

function StepAccount({ data, onChange, onNext, authMode }) {
  const [librarySearch, setLibrarySearch] = useState('');
  const isSignIn = authMode === 'signin';

  const filteredLibraries = librarySearch.trim()
    ? mockLibraries.filter(
        (lib) =>
          lib.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
          lib.city.toLowerCase().includes(librarySearch.toLowerCase()),
      )
    : [];

  const selectLibrary = (lib) => {
    if (data.selectedLibrary?.code === lib.code) {
      onChange({ selectedLibrary: null });
    } else {
      onChange({ selectedLibrary: lib });
    }
  };

  const inputClasses = 'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {isSignIn ? 'Sign in' : 'Create your account'}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {isSignIn
          ? 'Enter your handle and an app password to connect your AT Protocol identity.'
          : 'This is simulated for now — real AT Protocol auth coming soon.'}
      </p>

      <form className="space-y-4 mb-8" onSubmit={(e) => e.preventDefault()} autoComplete="off">
        {/* Handle */}
        <div>
          <label htmlFor="handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Handle</label>
          <input
            id="handle"
            type="text"
            value={data.handle}
            onChange={(e) => onChange({ handle: e.target.value })}
            placeholder={isSignIn ? 'you.bsky.social or your.domain.com' : 'yourname.bsky.social'}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Your full handle — e.g. alice.bsky.social or alice.example.com
          </p>
        </div>

        {/* Display name — only for create */}
        {!isSignIn && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
            <input
              id="displayName"
              type="text"
              value={data.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
              placeholder="Your Name"
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              className={inputClasses}
            />
          </div>
        )}

        {/* Password / App password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isSignIn ? 'App Password' : 'Password'}
          </label>
          <input
            id="password"
            type="password"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder={isSignIn ? 'xxxx-xxxx-xxxx-xxxx' : 'Create a password'}
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            className={inputClasses}
          />
          {isSignIn && (
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Generate one at Settings &rarr; App Passwords in{' '}
              <a href="https://bsky.app/settings/app-passwords" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 dark:hover:text-gray-300">
                bsky.app
              </a>
            </p>
          )}
        </div>
      </form>

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-6" />

      {/* Connect Your Library */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Connect Your Library</h3>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={librarySearch}
          onChange={(e) => setLibrarySearch(e.target.value)}
          placeholder="Search by library name or city..."
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-9 pr-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {filteredLibraries.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 mb-3">
          {filteredLibraries.map((lib) => {
            const selected = data.selectedLibrary?.code === lib.code;
            return (
              <li
                key={lib.code}
                onClick={() => selectLibrary(lib)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                  selected
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{lib.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{lib.city}</p>
                </div>
                {selected && <Check className="w-5 h-5 text-green-600 dark:text-green-400" />}
              </li>
            );
          })}
        </ul>
      )}

      {data.selectedLibrary && (
        <p className="text-sm text-green-600 dark:text-green-400 mb-3 flex items-center gap-1">
          <Check className="w-4 h-4" />
          {data.selectedLibrary.name}
        </p>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200 dark:border-gray-700 my-6" />

      {/* Preferred Reading Language */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Globe className="w-5 h-5 text-indigo-500" />
        Preferred Reading Language
      </h3>
      <select
        value={data.language || 'en'}
        onChange={(e) => onChange({ language: e.target.value })}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => {
          onChange({ selectedLibrary: null });
          onNext();
        }}
        className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline mb-6 block"
      >
        Skip for now
      </button>

      <Button size="lg" className="w-full" onClick={onNext}>
        {isSignIn ? 'Sign In & Continue' : 'Continue'}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ─── Step 3 — Find Readers ─────────────────────────────────────── */

function StepFindReaders({ followedUsers, setFollowedUsers, onNext }) {
  const toggleUser = (handle) => {
    setFollowedUsers((prev) =>
      prev.includes(handle) ? prev.filter((h) => h !== handle) : [...prev, handle],
    );
  };

  const followAll = () => setFollowedUsers(mockUsers.map((u) => u.handle));
  const skipAll = () => setFollowedUsers([]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6" />
          Find readers you know
        </h2>
      </div>

      <div className="flex gap-2 mb-4">
        <Button size="sm" variant="secondary" onClick={followAll}>
          Follow All
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { skipAll(); onNext(); }}>
          Skip
        </Button>
      </div>

      <ul className="space-y-3 mb-8">
        {mockUsers.map((user) => {
          const isFollowed = followedUsers.includes(user.handle);
          return (
            <li
              key={user.handle}
              onClick={() => toggleUser(user.handle)}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                isFollowed
                  ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Avatar name={user.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user.handle}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user.bio}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                  {user.mutuals} mutual connections
                </span>
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isFollowed
                      ? 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isFollowed && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Button size="lg" className="w-full" onClick={onNext}>
        {followedUsers.length > 0 ? `Following ${followedUsers.length} readers` : 'Continue'}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ─── Step 4 — Import Library ───────────────────────────────────── */

function StepImport({ importedBooks, setImportedBooks, onNext }) {
  const [platform, setPlatform] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ completed: 0, total: 0 });
  const fileRef = useRef(null);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setImporting(true);
      try {
        const books = await autoImport(file);
        setImportedBooks(books);
        setImporting(false);

        // Start enriching covers in the background
        setEnriching(true);
        const enriched = await enrichCovers(books, (completed, total) => {
          setEnrichProgress({ completed, total });
        });
        setImportedBooks(enriched);
      } catch {
        setImporting(false);
      } finally {
        setEnriching(false);
      }
    },
    [setImportedBooks],
  );

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  const platformLabel = platform
    ? PLATFORMS.find((p) => p.id === platform)?.label ?? platform
    : '';

  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <Upload className="w-6 h-6" />
        Import your library
      </h2>

      {/* Platform pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              platform === p.id
                ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Platform-specific instructions */}
      {platform && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">{platformLabel}:</span>{' '}
            {PLATFORM_INSTRUCTIONS[platform]}
          </p>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mb-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-3" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Drag and drop your CSV file here</p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv"
          onChange={onFileChange}
          className="hidden"
        />
        <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
          Browse Files
        </Button>
      </div>

      {/* Importing indicator */}
      {importing && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 animate-pulse">Importing...</p>
      )}

      {/* Import result */}
      {importedBooks.length > 0 && !importing && (
        <div className="mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <Check className="w-4 h-4" />
            Found {importedBooks.length} books{platformLabel ? ` from ${platformLabel}` : ''}
          </p>
        </div>
      )}

      {/* Enrich progress bar */}
      {enriching && enrichProgress.total > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Fetching covers...</span>
            <span>
              {enrichProgress.completed} / {enrichProgress.total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
              style={{
                width: `${(enrichProgress.completed / enrichProgress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button size="lg" className="w-full" onClick={onNext}>
          Continue
          <ArrowRight className="w-4 h-4" />
        </Button>
        <button
          onClick={onNext}
          className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

/* ─── Step 5 — Confirmation ─────────────────────────────────────── */

function StepConfirmation({ followedCount, bookCount, libraryName, onFinish }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
        <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">You&apos;re all set!</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-10 max-w-sm">
        Following {followedCount} readers &bull; {bookCount} books imported &bull; Library:{' '}
        {libraryName || 'none'}
      </p>
      <Button size="lg" className="w-full max-w-xs" onClick={onFinish}>
        Start Reading
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

/* ─── Main Wizard ───────────────────────────────────────────────── */

export default function Onboarding({ onComplete, importBooks: importBooksProp }) {
  const navigate = useNavigate();
  const { importBooks: importBooksHook } = useBooks();
  const doImport = importBooksProp || importBooksHook;
  const { updateSetting } = useSettings();

  const [step, setStep] = useState(1);
  const [authMode, setAuthMode] = useState('create'); // 'create' or 'signin'

  // Collected data
  const [accountData, setAccountData] = useState({
    handle: '',
    displayName: '',
    password: '',
    selectedLibrary: null,
  });
  const [followedUsers, setFollowedUsers] = useState([]);
  const [importedBooks, setImportedBooks] = useState([]);

  const updateAccount = (partial) => setAccountData((prev) => ({ ...prev, ...partial }));

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleFinish = () => {
    localStorage.setItem('shelfwise-onboarded', 'true');

    if (importedBooks.length > 0) {
      doImport(importedBooks);
    }

    if (accountData.selectedLibrary) {
      updateSetting('libraryCode', accountData.selectedLibrary.code);
      updateSetting('libraryName', accountData.selectedLibrary.name);
    }

    updateSetting('language', accountData.language || 'en');

    if (onComplete) onComplete();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between px-6 py-4">
        {step > 1 ? (
          <button
            onClick={back}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div />
        )}
        <ProgressDots current={step} total={5} />
        <div className="w-14" />
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">
          {step === 1 && (
            <StepWelcome
              onCreateAccount={() => { setAuthMode('create'); next(); }}
              onSignIn={() => { setAuthMode('signin'); next(); }}
            />
          )}
          {step === 2 && <StepAccount data={accountData} onChange={updateAccount} onNext={next} authMode={authMode} />}
          {step === 3 && (
            <StepFindReaders
              followedUsers={followedUsers}
              setFollowedUsers={setFollowedUsers}
              onNext={next}
            />
          )}
          {step === 4 && (
            <StepImport
              importedBooks={importedBooks}
              setImportedBooks={setImportedBooks}
              onNext={next}
            />
          )}
          {step === 5 && (
            <StepConfirmation
              followedCount={followedUsers.length}
              bookCount={importedBooks.length}
              libraryName={accountData.selectedLibrary?.name}
              onFinish={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
