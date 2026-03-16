import { useState, useRef } from 'react'
import useSettings from '../hooks/useSettings'
import useCriteria from '../hooks/useCriteria'
import useBooks from '../hooks/useBooks'
import useAuth from '../hooks/useAuth'
import Button from '../components/ui/Button'
import Pill from '../components/ui/Pill'
import Stars from '../components/ui/Stars'
import Slider from '../components/ui/Slider'
import { encodeCriteria, decodeCriteria } from '../lib/criteriaCodec'
import { autoImport, exportShelfwiseCSV } from '../lib/importers'
import { mockLibraries, criteriaTemplates } from '../lib/mockData'
import {
  Settings as SettingsIcon,
  Sun,
  Moon,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Search,
  Check,
  Share2,
  LogOut,
  Globe,
} from 'lucide-react'

const TABS = ['General', 'Criteria', 'Book Actions']

const ACQUIRE_SOURCES = [
  { value: 'none', label: 'None' },
  { value: 'libby', label: 'Libby' },
  { value: 'bookshop', label: 'Bookshop.org' },
  { value: 'powells', label: "Powell's" },
  { value: 'amazon', label: 'Amazon' },
  { value: 'kindle', label: 'Kindle' },
]

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
]

const TAP_ACTIONS = [
  { value: 'details', label: 'Show Details' },
  { value: 'social', label: 'Show Social' },
  { value: 'acquire', label: 'Acquire Book' },
]

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function Settings({ onLogout }) {
  const { settings, updateSetting } = useSettings()
  const { criteria, addCriterion, updateCriterion, removeCriterion, reorderCriteria } = useCriteria()
  const { books, importBooks } = useBooks()
  const { isAuthenticated, did, handle: authHandle, signOut } = useAuth()

  const [activeTab, setActiveTab] = useState('General')

  // Criteria tab state
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newType, setNewType] = useState('stars')
  const [newMax, setNewMax] = useState(5)
  const [shareCode, setShareCode] = useState('')
  const [importCode, setImportCode] = useState('')
  const [criteriaFeedback, setCriteriaFeedback] = useState(null)

  // Book Actions tab state
  const [librarySearch, setLibrarySearch] = useState('')
  const [importStatus, setImportStatus] = useState(null)
  const [importCount, setImportCount] = useState(null)
  const fileInputRef = useRef(null)

  // Social toggles — persisted in settings
  const shareActivity = settings.shareActivity ?? false
  const showInDiscovery = settings.showInDiscovery ?? false
  const setShareActivity = (v) => updateSetting('shareActivity', v)
  const setShowInDiscovery = (v) => updateSetting('showInDiscovery', v)

  const maskedApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    ? '****' + String(import.meta.env.VITE_ANTHROPIC_API_KEY).slice(-4)
    : null

  // --- Criteria handlers ---
  const handleAddCriterion = () => {
    if (!newName.trim()) return
    addCriterion({
      name: newName.trim(),
      emoji: newEmoji || '⭐',
      type: newType,
      max: Number(newMax) || 5,
    })
    setNewName('')
    setNewEmoji('')
    setNewType('stars')
    setNewMax(5)
  }

  const handleShareCriteria = () => {
    const code = encodeCriteria(criteria)
    setShareCode(code)
    setCriteriaFeedback(null)
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(shareCode)
      setCriteriaFeedback('Copied to clipboard!')
    } catch {
      setCriteriaFeedback('Failed to copy')
    }
    setTimeout(() => setCriteriaFeedback(null), 2000)
  }

  const [previewCriteria, setPreviewCriteria] = useState(null)

  const handlePreviewCriteria = () => {
    const decoded = decodeCriteria(importCode.trim())
    if (decoded && Array.isArray(decoded)) {
      setPreviewCriteria(decoded)
      setCriteriaFeedback(null)
    } else {
      setCriteriaFeedback('Invalid criteria code. Please check and try again.')
      setPreviewCriteria(null)
      setTimeout(() => setCriteriaFeedback(null), 3000)
    }
  }

  const handleImportCriteriaReplace = () => {
    if (!previewCriteria) return
    reorderCriteria(previewCriteria)
    setImportCode('')
    setPreviewCriteria(null)
    setCriteriaFeedback('Criteria imported successfully!')
    setTimeout(() => setCriteriaFeedback(null), 3000)
  }

  const handleImportCriteriaMerge = () => {
    if (!previewCriteria) return
    const existingIds = new Set(criteria.map((c) => c.id))
    const toAdd = previewCriteria.filter((c) => !existingIds.has(c.id))
    for (const c of toAdd) {
      addCriterion(c)
    }
    setImportCode('')
    setPreviewCriteria(null)
    setCriteriaFeedback(`Merged ${toAdd.length} new criteria!`)
    setTimeout(() => setCriteriaFeedback(null), 3000)
  }

  const handleUseTemplate = (template) => {
    reorderCriteria(template.criteria.map((c) => ({ ...c })))
  }

  // --- Book Actions handlers ---
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportStatus('Importing...')
    setImportCount(null)
    try {
      const parsed = await autoImport(file)
      importBooks(parsed)
      setImportStatus('Import successful!')
      setImportCount(parsed.length)
    } catch {
      setImportStatus('Import failed. Please check the file format.')
      setImportCount(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleExport = () => {
    const csv = exportShelfwiseCSV(books)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shelfwise-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSelectLibrary = (lib) => {
    updateSetting('libraryCode', lib.code)
    updateSetting('libraryName', lib.name)
    setLibrarySearch('')
  }

  const handleDisconnectLibrary = () => {
    updateSetting('libraryCode', '')
    updateSetting('libraryName', '')
  }

  const filteredLibraries = librarySearch.trim()
    ? mockLibraries.filter(
        (lib) =>
          lib.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
          lib.city.toLowerCase().includes(librarySearch.toLowerCase()),
      )
    : []

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon size={28} className="text-gray-700 dark:text-gray-300" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ======================== GENERAL TAB ======================== */}
      {activeTab === 'General' && (
        <div className="space-y-8">
          {/* Theme Toggle */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Theme</h2>
            <div className="flex items-center gap-4">
              <Sun size={20} className="text-amber-500" />
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => updateSetting('theme', 'light')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    settings.theme === 'light'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => updateSetting('theme', 'dark')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    settings.theme === 'dark'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Dark
                </button>
              </div>
              <Moon size={20} className="text-indigo-400" />
            </div>
          </section>

          {/* Preferred Reading Language */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Preferred Reading Language
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Filter search results and recommendations by language
            </p>
            <div className="flex items-center gap-3">
              <Globe size={20} className="text-indigo-500" />
              <select
                value={settings.language || 'en'}
                onChange={(e) => updateSetting('language', e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Default Book Tap Action */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Default Book Tap Action
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              What happens when you tap a book in your shelf
            </p>
            <div className="space-y-2">
              {TAP_ACTIONS.map((action) => (
                <label
                  key={action.value}
                  className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <input
                    type="radio"
                    name="defaultAction"
                    value={action.value}
                    checked={(settings.defaultAction || 'details') === action.value}
                    onChange={() => updateSetting('defaultAction', action.value)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{action.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Social Toggles */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Social</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Share reading activity
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Let friends see what you're reading
                  </p>
                </div>
                <Toggle checked={shareActivity} onChange={setShareActivity} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Show in reader discovery
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Appear in recommendations for readers with similar taste
                  </p>
                </div>
                <Toggle checked={showInDiscovery} onChange={setShowInDiscovery} />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ======================== CRITERIA TAB ======================== */}
      {activeTab === 'Criteria' && (
        <div className="space-y-8">
          {/* Current Criteria */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Your Rating Criteria
            </h2>
            {criteria.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                No criteria configured. Add one below or use a template.
              </p>
            )}
            <div className="space-y-3">
              {criteria.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  {/* Emoji */}
                  <input
                    type="text"
                    value={c.emoji || ''}
                    onChange={(e) => updateCriterion(c.id, { emoji: e.target.value })}
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    className="w-10 text-center text-lg border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700"
                    maxLength={2}
                    title="Emoji"
                  />
                  {/* Name */}
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateCriterion(c.id, { name: e.target.value })}
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    className="flex-1 min-w-0 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  {/* Type toggle */}
                  <select
                    value={c.type || 'stars'}
                    onChange={(e) => updateCriterion(c.id, { type: e.target.value })}
                    className="px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="stars">Stars</option>
                    <option value="slider">Slider</option>
                  </select>
                  {/* Max */}
                  <input
                    type="number"
                    value={c.max || 5}
                    onChange={(e) => updateCriterion(c.id, { max: Number(e.target.value) || 5 })}
                    className="w-14 px-2 py-1 text-xs text-center border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    min={1}
                    max={20}
                    title="Max value"
                  />
                  {/* Preview */}
                  <div className="hidden sm:flex items-center min-w-[120px]">
                    {c.type === 'slider' ? (
                      <Slider value={Math.floor((c.max || 10) / 2)} max={c.max || 10} readOnly />
                    ) : (
                      <Stars value={Math.floor((c.max || 5) / 2)} max={c.max || 5} readOnly />
                    )}
                  </div>
                  {/* Delete */}
                  <button
                    onClick={() => removeCriterion(c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Remove criterion"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Add New Criterion */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Add New Criterion
            </h3>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Emoji</label>
                <input
                  type="text"
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  placeholder="⭐"
                  maxLength={2}
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-12 text-center px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Criterion name"
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  data-form-type="other"
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option value="stars">Stars</option>
                  <option value="slider">Slider</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Max</label>
                <input
                  type="number"
                  value={newMax}
                  onChange={(e) => setNewMax(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  min={1}
                  max={20}
                />
              </div>
              <Button onClick={handleAddCriterion} size="sm">
                <Plus size={16} />
                Add
              </Button>
            </div>
          </section>

          {/* Community Templates */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Community Templates
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {criteriaTemplates.map((template) => (
                <div
                  key={template.name}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {template.name}
                  </h3>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {template.criteria.map((tc) => (
                      <Pill key={tc.id} color="indigo">
                        {tc.emoji} {tc.name}
                      </Pill>
                    ))}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Share / Import Codes */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Share &amp; Import Criteria
            </h2>
            <div className="space-y-4">
              {/* Share */}
              <div>
                <Button variant="secondary" size="sm" onClick={handleShareCriteria}>
                  <Share2 size={16} />
                  Share your criteria
                </Button>
                {shareCode && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={shareCode}
                      readOnly
                      className="flex-1 px-3 py-1.5 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={handleCopyCode}
                      className="p-2 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Copy code"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                )}
              </div>
              {/* Import */}
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Import criteria from code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={importCode}
                    onChange={(e) => { setImportCode(e.target.value); setPreviewCriteria(null) }}
                    placeholder="Paste criteria code here"
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    data-form-type="other"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    onKeyDown={(e) => e.key === 'Enter' && handlePreviewCriteria()}
                  />
                  <Button size="sm" onClick={handlePreviewCriteria}>
                    <Upload size={16} />
                    Preview
                  </Button>
                </div>
                {previewCriteria && (
                  <div className="mt-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                      Preview ({previewCriteria.length} criteria)
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {previewCriteria.map((c) => (
                        <Pill key={c.id} color="indigo">
                          {c.emoji} {c.name}
                        </Pill>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleImportCriteriaReplace}>
                        Use Template (Replace)
                      </Button>
                      <Button size="sm" variant="secondary" onClick={handleImportCriteriaMerge}>
                        Merge (Add Missing)
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {/* Feedback */}
              {criteriaFeedback && (
                <p className="text-sm flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Check size={14} />
                  {criteriaFeedback}
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ======================== BOOK ACTIONS TAB ======================== */}
      {activeTab === 'Book Actions' && (
        <div className="space-y-8">
          {/* Default Acquire Source */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Default Acquire Source
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Where to look first when acquiring a book
            </p>
            <div className="space-y-2">
              {ACQUIRE_SOURCES.map((src) => (
                <label
                  key={src.value}
                  className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <input
                    type="radio"
                    name="defaultAcquire"
                    value={src.value}
                    checked={(settings.defaultAcquire || 'none') === src.value}
                    onChange={() => updateSetting('defaultAcquire', src.value)}
                    className="accent-indigo-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{src.label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Library Connection */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Library Connection
            </h2>

            {/* Connected library */}
            {settings.libraryName && (
              <div className="flex items-center gap-3 mb-4 p-3 border border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Pill color="green">Connected</Pill>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {settings.libraryName}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({settings.libraryCode})
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-red-500 hover:text-red-600"
                  onClick={handleDisconnectLibrary}
                >
                  Disconnect
                </Button>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="Search libraries by name or city..."
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                data-form-type="other"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Results */}
            {filteredLibraries.length > 0 && (
              <ul className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700 max-h-48 overflow-y-auto">
                {filteredLibraries.map((lib) => (
                  <li key={lib.code}>
                    <button
                      onClick={() => handleSelectLibrary(lib)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {lib.name}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {lib.city}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {librarySearch.trim() && filteredLibraries.length === 0 && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No libraries found matching &ldquo;{librarySearch}&rdquo;
              </p>
            )}
          </section>

          {/* Import / Export */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Import &amp; Export
            </h2>
            <div className="space-y-4">
              {/* Import */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Upload size={18} className="text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Import Books
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Upload a CSV from Goodreads, StoryGraph, LibraryThing, Open Library, or Calibre
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv"
                  onChange={handleFileImport}
                  className="text-sm file:mr-3 file:px-4 file:py-2 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-700 file:text-sm"
                />
                {importStatus && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {importStatus}
                    {importCount != null && (
                      <span className="font-medium"> ({importCount} books)</span>
                    )}
                  </p>
                )}
              </div>

              {/* Export */}
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Download size={18} className="text-gray-500 dark:text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Export Library
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Download your entire library as a Shelfwise CSV ({books.length} books)
                </p>
                <Button variant="secondary" size="sm" onClick={handleExport}>
                  <Download size={16} />
                  Export Library
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ======================== FOOTER ======================== */}
      <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
        {/* AT Protocol account info */}
        {isAuthenticated && (
          <div className="mb-6 p-4 border border-indigo-200 dark:border-indigo-800 rounded-lg bg-indigo-50 dark:bg-indigo-950">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Signed in as <span className="font-semibold text-indigo-600 dark:text-indigo-400">@{authHandle}</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                  {did}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Books syncing to your PDS
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div>
            {maskedApiKey ? (
              <span>
                API Key:{' '}
                <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  {maskedApiKey}
                </code>
              </span>
            ) : (
              <span>
                API Key: <span className="text-amber-600 dark:text-amber-400">Not configured</span>
                <span className="ml-1">&mdash; set VITE_ANTHROPIC_API_KEY in .env.local for AI recommendations</span>
              </span>
            )}
          </div>
          <span>Shelfwise v0.1.0</span>
        </div>

        <div className="mt-6">
          <button
            onClick={async () => {
              if (window.confirm('Are you sure you want to log out? Your library data will be kept locally.')) {
                if (isAuthenticated) {
                  await signOut()
                } else {
                  localStorage.removeItem('shelfwise-onboarded')
                  onLogout?.()
                }
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
          >
            <LogOut size={16} />
            {isAuthenticated ? 'Sign Out' : 'Log Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
