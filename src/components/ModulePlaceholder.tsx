import { LucideIcon } from 'lucide-react';

interface ModulePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export default function ModulePlaceholder({ title, description, icon: Icon }: ModulePlaceholderProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
          <Icon className="h-6 w-6 text-blue-600" aria-hidden="true" />
        </div>
        <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">
          {title}
        </h2>
        <p className="mt-4 max-w-2xl text-xl text-slate-500 mx-auto">
          {description}
        </p>
        <div className="mt-8">
          <div className="inline-flex rounded-md shadow">
            <button
              disabled
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
