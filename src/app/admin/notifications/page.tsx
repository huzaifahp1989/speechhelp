import AdminGateClient from '@/components/AdminGateClient';
import NotificationsAdminClient from './NotificationsAdminClient';

export const metadata = {
  title: 'Push Notifications Admin | SpeechHelp',
  description: 'Send Quran reminder push notifications via OneSignal.',
};

export default function NotificationsAdminPage() {
  return (
    <AdminGateClient title="Speechhelp — Push Notifications (Admin)">
      <NotificationsAdminClient />
    </AdminGateClient>
  );
}
