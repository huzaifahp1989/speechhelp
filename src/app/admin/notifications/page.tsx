import NotificationsAdminClient from './NotificationsAdminClient';

export const metadata = {
  title: 'Push Notifications Admin | SpeechHelp',
  description: 'Send Quran reminder push notifications via OneSignal.',
};

export default function NotificationsAdminPage() {
  return <NotificationsAdminClient />;
}
