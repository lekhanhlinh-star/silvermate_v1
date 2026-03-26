export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}
