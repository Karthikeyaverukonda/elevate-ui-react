// Please verify this list matches your existing award categories exactly.
// If you had custom awards, add them here.
export type AwardType = 
  | "Culture Champion"
  | "Bug Slayer"
  | "Team Player"
  | "Innovator"
  | "Customer Hero"
  | "Early Bird"
  | "Night Owl"
  | "Code Wizard";

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
  department: string; // This field is required for the new Fairness Logic
  profilePicture: string;
  badges: Badge[];
  totalScore: number;
}