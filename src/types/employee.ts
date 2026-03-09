export type AwardType = string;

export interface Badge {
  id: string;
  type: AwardType;
  givenBy: string;
  givenById?: string;
  comment: string;
  rating: number;
  timestamp: string | Date;
  reactions: Array<{ emoji: string; count: number }>;
}

export interface Employee {
  id: string;
  name: string;
  jobTitle: string;
  department: string; 
  profilePicture: string;
  badges: Badge[];
  totalScore: number;
}