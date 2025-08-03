import { useState, useEffect, type ReactNode } from 'react';
import { Command } from 'lucide-react';
import Sidebar from './Sidebar';
import QuickAddTask from './QuickAddTask';

interface LayoutProps {
  children: ReactNode;
  onTaskCreated?: () => void;
}

export default function Layout({ children, onTaskCreated }: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTaskCreated = () => {
    onTaskCreated?.();
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <main className="flex-1">
        {/* Header with Quick Add button */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1"></div>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Quick Add Task (Cmd/Ctrl + K)"
            >
              <Command className="h-3.5 w-3.5" />
              <span>Quick Add</span>
              <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">K</kbd>
            </button>
          </div>
        </div>
        
        {children}
        
        {/* Quick Add Task Modal */}
        <QuickAddTask
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          onTaskCreated={handleTaskCreated}
        />
      </main>
    </div>
  );
}