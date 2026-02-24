export type TagType =
  | 'duration'
  | 'equipment'
  | 'body_focus'
  | 'difficulty'
  | 'format'
  | 'custom';

export type PlanTier = 'free' | 'pro';

export type EventType = 'opened' | 'done';

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  plan_tier: PlanTier;
  created_at: string;
  updated_at: string;
}

export interface WorkoutLink {
  id: string;
  user_id: string;
  url: string;
  title: string;
  source_domain: string;
  thumbnail_url: string | null;
  notes: string | null;
  duration_minutes: number | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  tag_type: TagType;
  created_at: string;
}

export interface WorkoutLinkTag {
  workout_link_id: string;
  tag_id: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface CollectionWithCount {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  workout_count: number;
}

export interface CollectionItem {
  collection_id: string;
  workout_link_id: string;
  user_id: string;
}

export interface WorkoutEvent {
  id: string;
  user_id: string;
  workout_link_id: string;
  event_type: EventType;
  occurred_at: string;
}

// Extended types for UI
export interface WorkoutLinkWithTags extends WorkoutLink {
  tags: Tag[];
}
