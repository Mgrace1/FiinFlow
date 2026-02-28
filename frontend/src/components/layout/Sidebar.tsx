import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Receipt, 
  BarChart3, 
  UserCog, 
  Settings,
  ChevronLeft,
  ChevronRight,
  X 
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setSidebarOpen }) => {
  const [isExpanded, setIsExpanded] = useState(true); 
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Clients', path: '/clients', icon: Users },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Team', path: '/team', icon: UserCog },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden ${
          isSidebarOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      <div
        className={`fixed top-0 left-0 h-full ${
          isExpanded ? 'w-64' : 'w-20'
        } bg-sidebar-dark text-white flex flex-col z-40 transform transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0`}
      >
        {/* Logo Section */}
         <div className="flex items-center justify-between h-20 px-4 border-b border-sidebar-light">
          {isExpanded ? (
            <div className="flex items-center justify-between w-full">
              <div>
                <h1 className="text-xl font-bold">FiinFlow</h1>
                <p className="text-xs text-gray-400">Financial Management</p>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="md:hidden text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <div className="w-full flex justify-center">
              <span className="text-sm font-bold tracking-wider">FiinFlow</span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center ${
                    isExpanded ? 'px-4' : 'justify-center px-0'
                  } py-3 mx-2 rounded-lg transition-colors relative group ${
                    isActive
                      ? 'bg-primary-500 text-white'
                      : 'text-gray-300 hover:bg-sidebar-light'
                  }`
                }
              >
                <Icon className={`${isExpanded ? 'w-5 h-5 mr-3' : 'w-5 h-5'}`} />
                
                {isExpanded && <span className="text-sm font-medium">{item.name}</span>}
                
                {!isExpanded && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="py-4 border-t border-sidebar-light">
          <button
            onClick={toggleSidebar}
            className={`flex items-center ${
              isExpanded ? 'justify-between px-4' : 'justify-center'
            } w-full text-gray-400 hover:text-white transition-colors`}
          >
            {isExpanded ? (
              <>
                
                <ChevronLeft className="w-4 h-4" />
              </>
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;