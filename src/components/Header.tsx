import React from 'react';
import { User } from 'firebase/auth';
import { ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header id="app-header" className="border-b border-slate-100 bg-white px-5 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-2.5">
        <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-950 tracking-tight">CrediFile</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Loan Application Hub</p>
        </div>
      </div>

      {user && (
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-xs font-semibold text-slate-800 leading-tight">
              {user.displayName || 'Applicant'}
            </span>
            <span className="text-[10px] text-slate-400 leading-none truncate max-w-[120px]">
              {user.email}
            </span>
          </div>
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full border border-slate-200 shadow-sm"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
              <UserIcon className="w-4 h-4" />
            </div>
          )}
          <button
            onClick={() => {
              onLogout();
            }}
            id="logout-btn"
            title="Log Out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-50 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </header>
  );
}
