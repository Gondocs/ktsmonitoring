export type Monitor = {
  id: number;
  url: string;
  name: string;
  last_status: number | null;
  last_response_time_ms: number | null;
  ssl_days_remaining: number | null;
  has_hsts: boolean | null;
  redirect_count: number | null;
  is_wordpress: boolean | null;
  wordpress_version: string | null;
  content_last_modified_at: string | null;
  stability_score: number | null;
  last_checked_at: string | null;
  is_active: boolean;
};

export type MonitorLog = {
  id: number;
  monitor_id: number;
  status_code: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  checked_at: string;
  created_at: string;
};
