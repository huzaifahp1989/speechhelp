export type SiteAnnouncement = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  target_pages: string[];
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  show_once: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementForm = {
  title: string;
  body: string;
  link_url: string;
  link_label: string;
  target_pages: string[];
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  show_once: boolean;
  priority: number;
};
