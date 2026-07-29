import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/LocalAuthContext';
import { Button } from '@/components/ui/button';

export default function TopBar({ title, showBack = false, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-16">
        <div className="flex items-center gap-3 min-w-0">
          {showBack && (
            <Button variant="outline" size="icon" onClick={() => navigate('/')} aria-label="Back to dashboard">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="text-lg md:text-xl font-semibold truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden sm:block leading-tight">
              <div className="text-sm font-medium text-slate-900">{user?.fullName}</div>
              <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                {isAdmin ? 'Admin' : 'Assistant'}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
