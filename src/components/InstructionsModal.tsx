'use client';

import { ReactNode } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export default function InstructionsModal({ open, title, subtitle, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl md:rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-start md:items-center bg-slate-50 gap-3">
          <div className="flex-1">
            <h3 className="text-lg md:text-2xl font-bold text-slate-900">{title}</h3>
            {subtitle ? (
              <p className="text-slate-500 font-medium mt-1 text-xs md:text-base">{subtitle}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200 transition-all flex-shrink-0"
          >
            <X className="w-5 md:w-6 h-5 md:h-6" />
          </button>
        </div>

        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-white custom-scrollbar">
          <div className="text-sm md:text-base text-slate-700 font-medium leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

