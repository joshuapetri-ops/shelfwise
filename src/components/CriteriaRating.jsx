import Stars from './ui/Stars';
import Slider from './ui/Slider';

export default function CriteriaRating({ criteria, ratings, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      {criteria.map((criterion) => (
        <div key={criterion.id} className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">
            {criterion.emoji && (
              <span className="mr-1">{criterion.emoji}</span>
            )}
            {criterion.name}
          </span>

          {criterion.type === 'stars' ? (
            <Stars
              value={ratings[criterion.id] ?? 0}
              onChange={(value) => onChange(criterion.id, value)}
            />
          ) : (
            <Slider
              value={ratings[criterion.id] ?? criterion.min ?? 0}
              min={criterion.min ?? 0}
              max={criterion.max ?? 10}
              step={criterion.step ?? 1}
              onChange={(value) => onChange(criterion.id, value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
