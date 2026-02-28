import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar
          isSidebarOpen={isSidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
