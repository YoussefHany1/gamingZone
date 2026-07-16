export interface Source {
  name: string;
  language: string;
  image?: string;
}

export interface SourceDropdownProps {
  sources: Source[];
  currentSource: string;
  currentCategory: string;
  activeLang: string;
}

export interface TimeAgoClientProps {
  dateStr: string;
  format?: "timeAgo" | "date";
}
