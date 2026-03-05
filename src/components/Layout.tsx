import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, FileEdit, BookOpen, Home, Github, Menu, X, LogOut, User as UserIcon, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'CV Builder', path: '/builder', icon: FileText },
    { name: 'Cover Letter', path: '/cover-letter', icon: FileEdit },
    { name: 'Blog', path: '/blog', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
                P
              </div>
              <span className="text-xl font-bold tracking-tight">PakuaCV</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    location.pathname === item.path 
                      ? 'text-zinc-900' 
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  <item.icon size={16} />
                  {item.name}
                </Link>
              ))}
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <Github size={20} />
              </a>

              {user ? (
                <div className="flex items-center gap-4 ml-4 pl-4 border-l border-zinc-200">
                  <Link 
                    to="/profile"
                    className="flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
                  >
                    <UserIcon size={16} />
                    <span className="max-w-[100px] truncate">{user.email}</span>
                  </Link>
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              ) : (
                <Link 
                  to="/auth" 
                  className="bg-zinc-900 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-zinc-800 transition-all"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile Nav Trigger */}
            <div className="md:hidden flex items-center gap-4">
               {!user && (
                 <Link to="/auth" className="bg-zinc-900 text-white px-4 py-2 rounded-full text-sm font-medium">
                  Sign In
                 </Link>
               )}
               <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
               >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
               </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-zinc-200 py-4 px-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === item.path 
                    ? 'bg-zinc-100 text-zinc-900' 
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            ))}
            {user && (
              <button
                onClick={() => {
                  logout();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={18} />
                Logout ({user.email})
              </button>
            )}
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-white border-t border-zinc-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center text-white text-xs font-bold">P</div>
                <span className="text-lg font-bold">PakuaCV</span>
              </div>
              <p className="text-zinc-500 text-sm max-w-xs">
                Empowering professionals with AI-driven career tools to build their future.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link to="/builder" className="hover:text-zinc-900">CV Builder</Link></li>
                <li><Link to="/cover-letter" className="hover:text-zinc-900">Cover Letter</Link></li>
                <li><Link to="/blog" className="hover:text-zinc-900">Blog</Link></li>
                <li><Link to="/" className="hover:text-zinc-900">Templates</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link to="/" className="hover:text-zinc-900">About</Link></li>
                <li><Link to="/" className="hover:text-zinc-900">Privacy</Link></li>
                <li><Link to="/" className="hover:text-zinc-900">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-zinc-100 text-center text-zinc-400 text-xs">
            © {new Date().getFullYear()} PakuaCV. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
