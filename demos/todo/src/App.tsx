import { useTools } from '@mcp-web/react';
import { useAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { MainContent } from './components/MainContent';
import {
  DarkNoiseBackground,
  NoiseBackground,
} from './components/NoiseBackground';
import { Sidebar } from './components/Sidebar';
import { themeAtom } from './states';
import { projectTools, settingsTools, todoTools } from './tools';

function App() {
  const [theme] = useAtom(themeAtom);

  // Register all state tools app-wide
  useTools(todoTools, projectTools, settingsTools);

  // Determine if dark mode should be active
  const isDarkMode = useMemo(() => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, [theme]);

  // Handle dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    }
  }, [theme]);

  return (
    <>
      {isDarkMode ? (
        <DarkNoiseBackground
          grain={0.04}
          vignette={0.661}
          noiseFrequency={0.0008}
          animationSpeed={0.00008}
        />
      ) : (
        <NoiseBackground
          grain={0.04}
          vignette={0.661}
          noiseFrequency={0.0008}
          animationSpeed={0.00008}
        />
      )}
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <MainContent />
        </div>
      </div>
    </>
  );
}

export default App;
