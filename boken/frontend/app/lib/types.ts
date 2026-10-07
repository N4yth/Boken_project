export type Genre = {
  id: string;
  name: string;
};

export type Release = {
  id: string;
  total_chapter: number;
  alt_title?: string;
  description?: string;
  language?: string;
};

export type WebtoonStatus = "in progress" | "finish" | "pause" | "cancel";
export type ReadingStatus = "to read" | "reading" | "finish";

export type Webtoon = {
  id: string;
  title: string;
  authors: string;
  rating: number;
  status?: WebtoonStatus | string;
  releases?: Release[];
  genres?: Genre[];
  addable?: boolean;
  is_public?: boolean;
  waiting_review?: boolean;
  release_date?: string;
  update_at?: string;
  add_by?: { username: string } | null;
};

export type LibraryWebtoon = Webtoon & {
  UR_rating: number;
  UR_total_chapter: number;
};

export type UserRelease = {
  id: string;
  release_id: string;
  personal_total_chapter: number;
  chapter_read: number;
  note: string;
  rating: number;
  reading_status: ReadingStatus | string;
  update_at?: string;
};
