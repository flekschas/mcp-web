import { useEffect, useRef, useState } from 'react';

const PATTERNS = [
  'pattern-diagonal',
  'pattern-dots',
  'pattern-hlines',
  'pattern-vlines',
  'pattern-zigzag',
  'pattern-rectangles',
  'pattern-diamonds',
  'pattern-grid',
  'pattern-triangles',
];

interface PatternPickerProps {
  value: string | null;
  onChange: (pattern: string) => void;
}

export function PatternPicker({ value, onChange }: PatternPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 rounded-full border-2 border-(--color-border) hover:border-(--color-text) transition-colors cursor-pointer"
        title="Select pattern"
      >
        <div className={`w-full h-full rounded-full ${value || 'pattern-dots'}`} />
      </button>

      {isOpen && (
        <div className="absolute left-10 top-0 w-44 h-44 z-10 bg-(--color-bg) border-2 border-(--color-border) rounded-lg p-2 shadow-lg">
          <div className="grid grid-cols-3 gap-2">
            {PATTERNS.map((pattern) => (
              <button
                key={pattern}
                type="button"
                onClick={() => {
                  onChange(pattern);
                  setIsOpen(false);
                }}
                className={`w-12 h-12 rounded border-2 cursor-pointer transition-all ${
                  value === pattern
                    ? 'border-(--color-text) scale-110'
                    : 'border-(--color-border) hover:border-(--color-text) hover:scale-105'
                }`}
                title={pattern}
              >
                <div className={`w-full h-full rounded ${pattern}`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
