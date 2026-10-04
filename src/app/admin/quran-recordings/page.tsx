'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminGateClient from '@/components/AdminGateClient';
import { 
  Mic, 
  Play, 
  Pause, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Hourglass,
  ChevronRight,
  Star,
  MessageSquare,
  User,
  Filter
} from 'lucide-react';

interface Recording {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'reviewing' | 'approved' | 'needs_improvement';
  surah_from?: number;
  ayah_from?: number;
  surah_to?: number;
  ayah_to?: number;
  juz?: number;
  audio_url: string;
  duration_seconds?: number;
  admin_rating?: number;
  admin_feedback?: string;
  points_awarded?: number;
  mistakes_count?: number;
  mistakes_details?: any;
  created_at: string;
  reviewed_at?: string;
  user: {
    id: string;
    email: string;
    raw_user_meta_data?: { name?: string };
  };
  comments?: { count: number }[];
}

function AdminRecordingsPageInner() {
  const router = useRouter();
  
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchRecordings();
  }, [activeTab, statusFilter]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      
      let url = '/api/admin/quran-recordings';
      const params = new URLSearchParams();
      
      if (statusFilter) {
        params.set('status', statusFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        let filtered = data.recordings || [];
        
        if (activeTab === 'pending') {
          filtered = filtered.filter((r: Recording) => r.status === 'pending');
        } else if (activeTab === 'reviewed') {
          filtered = filtered.filter((r: Recording) => r.status !== 'pending');
        }
        
        setRecordings(filtered);
        setError(null);
      } else {
        if (response.status === 403) {
          setError('Admin access required. Please contact an admin for permission.');
        } else if (response.status === 401) {
          router.push('/auth?redirect=/admin/quran-recordings');
        } else {
          setError(data.error || 'Failed to load recordings');
        }
        setRecordings([]);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'needs_improvement':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'reviewing':
        return <Hourglass className="w-5 h-5 text-blue-500" />;
      default:
        return <Hourglass className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'needs_improvement':
        return 'Needs Improvement';
      case 'reviewing':
        return 'Under Review';
      default:
        return 'Pending Review';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'needs_improvement':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'reviewing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-slate-600">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Loading recordings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-2"
              >
                Admin Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Mic className="w-7 h-7 text-emerald-600" />
                Quran Recording Reviews
              </h1>
              <p className="mt-1 text-slate-600">
                Review submitted recitations, give feedback, and award points
              </p>
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="reviewing">Under Review</option>
                <option value="approved">Approved</option>
                <option value="needs_improvement">Needs Improvement</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Mic className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Recordings</p>
                <p className="text-xl font-bold text-slate-900">{recordings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Hourglass className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Pending Review</p>
                <p className="text-xl font-bold text-slate-900">
                  {recordings.filter(r => r.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Approved</p>
                <p className="text-xl font-bold text-slate-900">
                  {recordings.filter(r => r.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Points Awarded</p>
                <p className="text-xl font-bold text-slate-900">
                  {recordings.reduce((sum, r) => sum + (r.points_awarded || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex flex-wrap gap-2 border-b border-slate-200">
          {[
            { id: 'all', label: 'All Recordings', count: recordings.length },
            { id: 'pending', label: 'Pending Review', count: recordings.filter(r => r.status === 'pending').length },
            { id: 'reviewed', label: 'Reviewed', count: recordings.filter(r => r.status !== 'pending').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Recordings List */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {recordings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mic className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No recordings found</h3>
            <p className="text-slate-600">
              {activeTab === 'pending' 
                ? 'Great job! No pending recordings to review.'
                : activeTab === 'reviewed'
                  ? 'No recordings have been reviewed yet.'
                  : 'No recordings have been submitted yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recordings.map((recording) => (
              <Link
                key={recording.id}
                href={`/admin/quran-recordings/${recording.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Student Info */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-slate-500">
                            {recording.user?.raw_user_meta_data?.name || recording.user?.email || 'Unknown Student'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-sm text-slate-500">
                            {new Date(recording.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-semibold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">
                          {recording.title}
                        </h3>
                        {recording.description && (
                          <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                            {recording.description}
                          </p>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border self-start ${getStatusColor(recording.status)}`}>
                        {getStatusIcon(recording.status)}
                        {getStatusText(recording.status)}
                      </span>
                    </div>

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                      {recording.surah_from && (
                        <span>
                          Surah {recording.surah_from}
                          {recording.ayah_from && `:${recording.ayah_from}`}
                          {recording.surah_to && ` - ${recording.surah_to}`}
                        </span>
                      )}
                      {recording.juz && (
                        <span>Juz {recording.juz}</span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(recording.duration_seconds)}
                      </span>
                      {recording.admin_rating && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Star className="w-4 h-4 fill-amber-500" />
                          {recording.admin_rating}/10
                        </span>
                      )}
                      {recording.points_awarded ? (
                        <span className="text-emerald-600 font-medium">
                          +{recording.points_awarded} pts
                        </span>
                      ) : null}
                      {recording.comments && recording.comments[0]?.count > 0 && (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <MessageSquare className="w-4 h-4" />
                          {recording.comments[0].count}
                        </span>
                      )}
                      {recording.mistakes_count ? (
                        <span className="text-red-600">
                          {recording.mistakes_count} mistake{recording.mistakes_count > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>

                    {/* Feedback Preview */}
                    {recording.admin_feedback && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                        <p className="text-slate-700 text-sm line-clamp-2">
                          <strong>Feedback:</strong> "{recording.admin_feedback}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-slate-400 hidden sm:block group-hover:text-emerald-600 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminRecordingsPage() {
  return (
    <AdminGateClient title="Speechhelp — Recordings Review (Admin)">
      <AdminRecordingsPageInner />
    </AdminGateClient>
  );
}
