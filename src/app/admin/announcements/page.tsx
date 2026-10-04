import AdminGateClient from '@/components/AdminGateClient';
import AnnouncementsAdminClient from './AnnouncementsAdminClient';

export const metadata = {
  title: 'Announcements Admin | SpeechHelp',
  description: 'Manage site-wide scheduled announcement pop-ups.',
};

export default function AnnouncementsAdminPage() {
  return (
    <AdminGateClient title="Speechhelp — Announcements (Admin)">
      <AnnouncementsAdminClient />
    </AdminGateClient>
  );
}
