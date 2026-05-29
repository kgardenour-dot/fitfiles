import { TagType } from '../types/database';

export const TAG_TYPE_LABELS: Record<TagType, string> = {
  duration: 'Prep Time',
  equipment: 'Cuisine',
  body_focus: 'Meal Type',
  difficulty: 'Difficulty',
  format: 'Source Type',
  custom: 'Custom',
};

export const DEFAULT_TAGS: { name: string; tag_type: TagType }[] = [
  // Prep Time
  { name: '< 15 min', tag_type: 'duration' },
  { name: '15-30 min', tag_type: 'duration' },
  { name: '30-45 min', tag_type: 'duration' },
  { name: '45-60 min', tag_type: 'duration' },
  { name: '60+ min', tag_type: 'duration' },
  // Cuisine
  { name: 'Italian', tag_type: 'equipment' },
  { name: 'Mexican', tag_type: 'equipment' },
  { name: 'Asian', tag_type: 'equipment' },
  { name: 'Mediterranean', tag_type: 'equipment' },
  { name: 'American', tag_type: 'equipment' },
  { name: 'Vegetarian', tag_type: 'equipment' },
  { name: 'Vegan', tag_type: 'equipment' },
  // Meal Type
  { name: 'Breakfast', tag_type: 'body_focus' },
  { name: 'Lunch', tag_type: 'body_focus' },
  { name: 'Dinner', tag_type: 'body_focus' },
  { name: 'Desserts', tag_type: 'body_focus' },
  { name: 'Meal Prep', tag_type: 'body_focus' },
  { name: 'Favorites', tag_type: 'body_focus' },
  { name: 'Quick Meals', tag_type: 'body_focus' },
  { name: 'Snacks', tag_type: 'body_focus' },
  // Difficulty
  { name: 'Beginner', tag_type: 'difficulty' },
  { name: 'Intermediate', tag_type: 'difficulty' },
  { name: 'Advanced', tag_type: 'difficulty' },
  // Source Type
  { name: 'Video', tag_type: 'format' },
  { name: 'Article', tag_type: 'format' },
  { name: 'PDF', tag_type: 'format' },
  { name: 'Blog', tag_type: 'format' },
  { name: 'Social Post', tag_type: 'format' },
];
