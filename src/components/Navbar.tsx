'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X, Search, User, BookOpen, Mic, FileText, Bookmark, GraduationCap, Library, ShieldCheck, PenTool, LogOut, Languages, Quote, Star, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { User as SupabaseUser } from '@supabase/supabase-js';

const navItems = [
  { name: 'Home', href: '/', icon: Library },
  { name: 'Qur’an', href: '/quran', icon: BookOpen },
  { name: 'Tafseer', href: '/tafseer', icon: FileText },
  { name: 'Hadith', href: '/hadith', icon: Bookmark },
  { name: 'Seerah', href: '/seerah', icon: GraduationCap },
  { name: '99 Names', href: '/names', icon: Star },
  { name: 'Quotes', href: '/quotes', icon: Quote },
  { name: 'Books', href: '/books', icon: BookOpen },
  { name: 'Topics', href: '/topics', icon: Search },
  { name: 'Lecture Builder', href: '/lecture-builder', icon: Mic },
  { name: 'Learn Arabic', href: '/learn-arabic', icon: Languages },
  { name: 'Dictionary', href: '/dictionary', icon: BookOpen },
  { name: 'Notes', href: '/notes', icon: PenTool },
  { name: 'Hifz Planner', href: '/hifz-planner', icon: Calendar },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex flex-col">
                <span className="font-bold text-xl text-slate-800">Lecture Hub</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Islam Media Central</span>
              </Link>
            </div>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex lg:space-x-4 lg:items-center">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            ))}
            <div className="ml-4 border-l pl-4 flex items-center gap-2">
               {user ? (
                 <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 hidden xl:inline">{user.email}</span>
                    <button 
                      onClick={handleSignOut}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                      title="Sign Out"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                 </div>
               ) : (
                 <Link href="/auth" className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600">
                    <User className="w-5 h-5" />
                    <span>Sign In</span>
                 </Link>
               )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={clsx('lg:hidden', isOpen ? 'block' : 'hidden')}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-b border-slate-200 shadow-lg">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 block px-3 py-2 rounded-md text-base font-medium flex items-center gap-3"
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
          <div className="border-t border-slate-200 pt-4 pb-3">
             {user ? (
               <div className="flex items-center px-5 justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User className="h-10 w-10 rounded-full bg-slate-100 p-2 text-slate-500" />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium leading-none text-slate-800">User</div>
                      <div className="text-sm font-medium leading-none text-slate-500">{user.email}</div>
                    </div>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="p-2 text-slate-400 hover:text-red-600"
                  >
                    <LogOut className="w-6 h-6" />
                  </button>
               </div>
             ) : (
               <Link 
                 href="/auth" 
                 onClick={() => setIsOpen(false)}
                 className="flex items-center justify-center gap-2 px-5 py-3 text-base font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50"
               >
                 <User className="w-5 h-5" />
                 Sign In
               </Link>
             )}
          </div>
        </div>
      </div>
    </nav>
  );
}
