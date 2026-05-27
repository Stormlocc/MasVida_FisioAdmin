import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../Logo';
import { LogOut, Sun, Moon, LayoutDashboard, Menu, X, PlusCircle } from 'lucide-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { GenderAvatar } from '../GenderAvatar';

export default function AppLayout() {
  const { currentUser, isGuest, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const links = [
    { to: '/', label: 'Panel Principal', icon: LayoutDashboard },
  ];

  if (currentUser?.role === 'MEDICO') {
    links.push({ to: '/staff', label: 'Personal Técnico', icon: PlusCircle });
  }

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/50"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-[var(--card)] border-r border-[var(--border)]",
          "transition-transform duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-20 px-4 border-b border-[var(--border)] gap-2">
          <div className="w-[160px] overflow-hidden shrink-0">
            <Logo className="scale-90 origin-left" />
          </div>
          <button 
            type="button"
            onClick={() => setSidebarOpen(false)} 
            className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--muted)] hover:bg-[var(--muted-foreground)]/10 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shrink-0"
            title="Cerrar barra lateral"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const active = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-medium text-sm",
                  active 
                    ? "bg-primary-50/40 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400" 
                    : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                )}
              >
                <link.icon size={18} className={active ? "text-primary-500" : "text-[var(--muted-foreground)]"} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--border)]">
          {!isGuest && currentUser ? (
            <>
              <div className="flex items-center gap-3 mb-4 px-2">
                <GenderAvatar gender={currentUser.gender} className="w-8 h-8 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{currentUser.fullName}</p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">{currentUser.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setSidebarOpen(false)}
              className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50 transition-colors"
            >
              <LogOut size={18} className="rotate-180" />
              Acceso Personal
            </Link>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="text-[var(--foreground)]"
            >
              <Menu size={24} />
            </button>
            <Link onClick={() => setSidebarOpen(false)} to="/" className="hover:opacity-80 transition-opacity lg:hidden">
              <Logo showText={false} className="scale-75" />
            </Link>
            {/* Desktop logo representation */}
            <Link to="/" className="hidden lg:flex hover:opacity-80 transition-opacity">
              <Logo className="scale-90 origin-left" />
            </Link>
          </div>
          
          <div className="ml-auto flex items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
