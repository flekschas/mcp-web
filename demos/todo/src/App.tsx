import { useMCPApps, useMCPTools } from '@mcp-web/react';
import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { statisticsApp } from './mcp-apps';
import { Header } from './components/Header';
import { MainContent } from './components/MainContent';
import { Sidebar } from './components/Sidebar';
import { themeAtom } from './states';
import { projectTools, settingsTools, todoTools } from './mcp-tools';

function App() {
  const [theme] = useAtom(themeAtom);

  // Register all state tools app-wide
  useMCPTools(todoTools, projectTools, settingsTools);

  // Register MCP Apps for visual AI rendering
  useMCPApps(statisticsApp);

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
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <MainContent />
        <footer className="text-center py-4 opacity-30 text-sm">
          <p>
            This demo showcases{' '}
            <a
              href="https://github.com/flekschas/mcp-web"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80 transition-opacity"
            >
              MCP-Web
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
