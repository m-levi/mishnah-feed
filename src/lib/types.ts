export interface Seder {
  name: string;
  hebrewName: string;
  masechtot: Masechet[];
}

export interface Masechet {
  name: string;
  hebrewName: string;
  slug: string;
  chapters: number;
}

export interface SourceText {
  ref: string;
  hebrew: string;
  english: string;
  segmentNumber: number;
}

export interface CarouselImage {
  prompt: string;
  data?: string;
  mimeType?: string;
  loading?: boolean;
}

export interface StormTweet {
  id: string;
  ref: string;
  slug?: string;
  sourceRef?: string;
  tweetNumber: number;
  totalTweets: number;
  text: string;
  needsImage: boolean;
  imagePrompt?: string;
  imageData?: string;
  imageMimeType?: string;
  imageLoading?: boolean;
  carousel?: CarouselImage[];
  label?: string; // contextual label like "This Week's Parsha", "Daf Yomi"
}

export interface CommentaryTweet {
  id: string;
  commentator: string;
  text: string;
  sourceRef: string;
}

export interface PickerState {
  categoryIndex: number;
  itemIndex: number;
  perek: string;
  mishnah: string;
}

export interface SavedStorm {
  id: string;
  source_type: SourceType;
  ref: string;
  tweets: StormTweet[];
  created_at: string;
}

export type SourceType = "mishnayos" | "gemara" | "chumash";

export type FeedMode = "study" | "discover";

// ─── Scroll Platform Types ──────────────────────────────────

export type ScrollType = "structured" | "calendar" | "custom";
export type ScrollSourceType = SourceType | "mixed";
export type CalendarType = "daf_yomi" | "daily_mishnah" | "parsha";

export interface StructuredConfig {
  slug: string;
  sourceType: SourceType;
  startRef?: string;
  endRef?: string;
}

export interface CalendarConfig {
  calendarType: CalendarType;
}

export interface CustomConfig {
  topic: string;
  teachingStyle?: string;
  sources?: { slug: string; ref: string; sourceType: SourceType }[];
}

export type ScrollConfig = StructuredConfig | CalendarConfig | CustomConfig;

export interface Scroll {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  scroll_type: ScrollType;
  source_type: ScrollSourceType;
  config: ScrollConfig;
  is_public: boolean;
  is_template: boolean;
  follower_count: number;
  cover_emoji: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrollItem {
  id: string;
  scroll_id: string;
  position: number;
  slug: string;
  ref: string;
  source_type: string;
  display_name: string;
  content: StormTweet[] | null;
  generated_at: string | null;
  created_at: string;
}

export interface UserScroll {
  id: string;
  user_id: string;
  scroll_id: string;
  current_position: number;
  is_creator: boolean;
  pinned: boolean;
  created_at: string;
  scroll?: Scroll;
}

export interface ScrollItemRead {
  user_id: string;
  scroll_item_id: string;
  read_at: string;
}
