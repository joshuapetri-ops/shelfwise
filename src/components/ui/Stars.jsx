import { Star } from 'lucide-react'

export default function Stars({ value = 0, max = 5, onChange, readOnly = false }) {
  return (
    <div className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value
        return (
          <button
            key={i}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(i + 1 === value ? 0 : i + 1)}
            className="disabled:cursor-default"
          >
            <Star
              size={18}
              className={filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}
            />
          </button>
        )
      })}
    </div>
  )
}
