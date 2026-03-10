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
