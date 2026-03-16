export default function Slider({ value = 0, min = 0, max = 10, step = 1, onChange, label, readOnly = false }) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[4rem]">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange?.(Number(e.target.value))}
        disabled={readOnly}
        className="flex-1 accent-indigo-600 disabled:opacity-50"
      />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{value}</span>
    </div>
  )
}
