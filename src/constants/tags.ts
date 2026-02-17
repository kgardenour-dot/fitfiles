import { TagType } from '../types/database';

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  duration: 'Duration',
  equipment: 'Equipment',
  body_focus: 'Body Focus',
  difficulty: 'Difficulty',
  format: 'Format',
  custom: 'Custom',
};

export const DEFAULT_TAGS: { name: string; tag_type: TagType }[] = [
  // Duration
  { name: '< 15 min', tag_type: 'duration' },
  { name: '15-30 min', tag_type: 'duration' },
  { name: '30-45 min', tag_type: 'duration' },
  { name: '45-60 min', tag_type: 'duration' },
  { name: '60+ min', tag_type: 'duration' },
  // Equipment
  { name: 'No Equipment', tag_type: 'equipment' },
  { name: 'Dumbbells', tag_type: 'equipment' },
  { name: 'Barbell', tag_type: 'equipment' },
  { name: 'Kettlebell', tag_type: 'equipment' },
  { name: 'Resistance Bands', tag_type: 'equipment' },
  { name: 'Pull-up Bar', tag_type: 'equipment' },
  { name: 'Machine', tag_type: 'equipment' },
  // Body Focus
  { name: 'Full Body', tag_type: 'body_focus' },
  { name: 'Upper Body', tag_type: 'body_focus' },
  { name: 'Lower Body', tag_type: 'body_focus' },
  { name: 'Core', tag_type: 'body_focus' },
  { name: 'Arms', tag_type: 'body_focus' },
  { name: 'Back', tag_type: 'body_focus' },
  { name: 'Chest', tag_type: 'body_focus' },
  { name: 'Legs', tag_type: 'body_focus' },
  { name: 'Shoulders', tag_type: 'body_focus' },
  { name: 'Cardio', tag_type: 'body_focus' },
  // Difficulty
  { name: 'Beginner', tag_type: 'difficulty' },
  { name: 'Intermediate', tag_type: 'difficulty' },
  { name: 'Advanced', tag_type: 'difficulty' },
  // Format
  { name: 'Video', tag_type: 'format' },
  { name: 'Article', tag_type: 'format' },
  { name: 'PDF', tag_type: 'format' },
  { name: 'Instagram Reel', tag_type: 'format' },
  { name: 'TikTok', tag_type: 'format' },
];
