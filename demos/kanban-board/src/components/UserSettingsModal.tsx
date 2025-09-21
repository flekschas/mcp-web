import { useState, useEffect } from 'react';
import type { User } from '../types';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  users: User[];
  onUserSwitch: (userId: string) => void;
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void;
}

const UserSettingsModal = ({
  isOpen,
  onClose,
  currentUser,
  users,
  onUserSwitch,
  onThemeChange,
}: UserSettingsModalProps) => {
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  // Detect current theme on mount
  useEffect(() => {
    if (isOpen) {
      const hasThemePreference = localStorage.getItem('theme');
      
      if (hasThemePreference) {
        setSelectedTheme(hasThemePreference as 'light' | 'dark' | 'auto');
      } else {
        setSelectedTheme('auto');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUserSwitch = () => {
    if (selectedUserId !== currentUser.id) {
      onUserSwitch(selectedUserId);
    }
    onClose();
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    setSelectedTheme(theme);
    if (onThemeChange) {
      onThemeChange(theme);
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'product-manager': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'engineer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'designer': return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200';
      case 'qa': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              User Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>Close</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Current User
            </h3>
            <div className="flex items-center space-x-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full"
              />
              <div className="flex-1">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {currentUser.name}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {currentUser.email}
                </p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor(currentUser.role)}`}>
                  {getRoleDisplayName(currentUser.role)}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Theme Preference
            </h3>
            <div className="flex gap-2">
              {[
                { value: 'light', label: 'Light', icon: '☀️' },
                { value: 'dark', label: 'Dark', icon: '🌙' },
                { value: 'auto', label: 'Auto', icon: '💻' }
              ].map((theme) => (
                <button
                  key={theme.value}
                  type="button"
                  onClick={() => handleThemeChange(theme.value as 'light' | 'dark' | 'auto')}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                    selectedTheme === theme.value
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className="mr-1">{theme.icon}</span>
                  {theme.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              Switch User (Demo)
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {users.filter((user) => user.id !== currentUser.id).map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUserId === user.id
                      ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="user"
                    value={user.id}
                    checked={selectedUserId === user.id}
                    onChange={() => setSelectedUserId(user.id)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {user.name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {user.email}
                      </p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg">
            💡 <strong>Demo Feature:</strong> Switch between different user personas to see how
            MCP queries can be contextualised based on user roles and permissions.
          </div>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUserSwitch}
            disabled={selectedUserId === currentUser.id}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:text-zinc-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed rounded-md transition-colors cursor-pointer"
          >
            Switch User
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsModal;
