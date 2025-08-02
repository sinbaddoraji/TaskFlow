import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Settings, 
  Home,
  LogOut 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`bg-white shadow-sm transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } min-h-screen relative`}>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-6 bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-sm hover:shadow-md hover:bg-white transition-all"
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {/* Header */}
      {!isCollapsed && (
          <div className="p-4 py-5 flex justify-center">
            <h1 className="text-xl font-bold text-indigo-600">TaskFlow</h1>
          </div> 
      )}

      {/* User Info */}
      <div className="p-4 mb-4 pb-4 border-b border-gray-100">
        {!isCollapsed ? (
          <Link 
            to="/profile"
            className="flex items-center space-x-3 hover:bg-gray-50/70 rounded-xl p-2 -m-2 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-200/60 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            to="/profile"
            className="flex justify-center hover:bg-gray-50/70 rounded-xl p-2 -m-2 transition-colors"
            title={`${user?.name || 'User'} - Go to Profile`}
          >
            <div className="w-8 h-8 bg-gray-200/60 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-gray-500" />
            </div>
          </Link>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="px-2">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-indigo-50/80 text-indigo-600'
                    : 'text-gray-500 hover:bg-gray-50/70 hover:text-gray-700'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <item.icon className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="absolute bottom-4 left-2 right-2">
        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50/70 hover:text-gray-700 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut className={`h-5 w-5 ${isCollapsed ? 'mx-auto' : 'mr-3'}`} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}