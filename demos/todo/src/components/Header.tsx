import { ArrowDownIcon, ArrowUpIcon, CheckIcon, ComputerDesktopIcon, MinusIcon, MoonIcon, SunIcon } from '@heroicons/react/20/solid';
import { useAtom } from 'jotai';
import { showCompletedAtom, sortByAtom, sortOrderAtom, themeAtom } from '../states';

export function Header() {
  const [theme, setTheme] = useAtom(themeAtom);
  const [sortBy, setSortBy] = useAtom(sortByAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const [showCompleted, setShowCompleted] = useAtom(showCompletedAtom);

  const cycleTheme = () => {
    setTheme(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  return (
    <div className="h-14 bg-(--color-bg-elevated)/25 border-b-2 border-(--color-border) flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-3">
        {/* Sort by */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'created_at' | 'due_date' | 'title')}
          className="select-retro"
        >
          <option value="created_at">Sort: Created</option>
          <option value="due_date">Sort: Due Date</option>
          <option value="title">Sort: Title</option>
        </select>

        {/* Sort order */}
        <button
          type="button"
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="btn-subtle btn-subtle-icon"
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {sortOrder === 'asc' && <ArrowUpIcon className="w-4 h-4" />}
          {sortOrder === 'desc' && <ArrowDownIcon className="w-4 h-4" />}
        </button>

        {/* Show/hide completed */}
        <button
          type="button"
          onClick={() => setShowCompleted(prev => !prev)}
          className="btn-subtle"
        >
          {showCompleted ? <CheckIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
          Completed
        </button>
      </div>

      {/* Theme toggle */}
      <button
        type="button"
        onClick={cycleTheme}
        className="btn-subtle btn-subtle-icon"
        title={`Theme: ${theme}`}
      >
        {theme === 'light' && <SunIcon className="w-4 h-4" />}
        {theme === 'dark' && <MoonIcon className="w-4 h-4" />}
        {theme === 'system' && <ComputerDesktopIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}
