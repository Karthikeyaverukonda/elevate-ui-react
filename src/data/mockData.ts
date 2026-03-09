import { Employee, AwardCategory, User } from "@/types/employee";

export const awardCategories: AwardCategory[] = [
  {
    type: "Bug Slayer",
    icon: "Bug",
    color: "hsl(0 84% 60%)",
    description: "Exceptional bug fixing and quality assurance",
  },
  {
    type: "Collaboration Champ",
    icon: "Users",
    color: "hsl(25 95% 53%)",
    description: "Outstanding teamwork and collaboration",
  },
  {
    type: "Customer Obsessed",
    icon: "Heart",
    color: "hsl(330 81% 60%)",
    description: "Putting customers first in every decision",
  },
  {
    type: "Documentation Dynamo",
    icon: "FileText",
    color: "hsl(192 91% 36%)",
    description: "Excellence in documentation and knowledge sharing",
  },
  {
    type: "Innovation Driver",
    icon: "Lightbulb",
    color: "hsl(45 93% 47%)",
    description: "Creative solutions and innovative thinking",
  },
  {
    type: "Most Improved",
    icon: "TrendingUp",
    color: "hsl(142 76% 36%)",
    description: "Remarkable growth and development",
  },
  {
    type: "Quality Guardian",
    icon: "Shield",
    color: "hsl(222 47% 11%)",
    description: "Unwavering commitment to quality",
  },
  {
    type: "Sprint Hero",
    icon: "Zap",
    color: "hsl(271 81% 56%)",
    description: "Outstanding performance during the sprint",
  },
];

export const mockEmployees: Employee[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    jobTitle: "Senior Frontend Developer",
    profilePicture: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
    badges: [
      {
        id: "b1",
        type: "Bug Slayer",
        givenBy: "John Doe",
        givenById: "2",
        comment: "Fixed critical production bugs quickly!",
        rating: 5,
        timestamp: new Date("2024-01-15"),
        reactions: [
          { userId: "3", emoji: "👍" },
          { userId: "4", emoji: "🎉" },
        ],
      },
      {
        id: "b2",
        type: "Collaboration Champ",
        givenBy: "Mike Chen",
        givenById: "3",
        comment: "Always helps team members with their challenges",
        rating: 5,
        timestamp: new Date("2024-01-14"),
        reactions: [{ userId: "2", emoji: "❤️" }],
      },
    ],
    totalScore: 10,
  },
  {
    id: "2",
    name: "John Doe",
    jobTitle: "Backend Developer",
    profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    badges: [
      {
        id: "b3",
        type: "Innovation Driver",
        givenBy: "Sarah Johnson",
        givenById: "1",
        comment: "Implemented amazing caching solution",
        rating: 5,
        timestamp: new Date("2024-01-16"),
        reactions: [{ userId: "1", emoji: "🎉" }],
      },
    ],
    totalScore: 5,
  },
  {
    id: "3",
    name: "Mike Chen",
    jobTitle: "Full Stack Developer",
    profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
    badges: [
      {
        id: "b4",
        type: "Sprint Hero",
        givenBy: "Emily Brown",
        givenById: "4",
        comment: "Completed all tasks ahead of schedule",
        rating: 5,
        timestamp: new Date("2024-01-17"),
        reactions: [],
      },
      {
        id: "b5",
        type: "Quality Guardian",
        givenBy: "John Doe",
        givenById: "2",
        comment: "Code reviews are always thorough",
        rating: 4,
        timestamp: new Date("2024-01-15"),
        reactions: [{ userId: "1", emoji: "👍" }],
      },
    ],
    totalScore: 9,
  },
  {
    id: "4",
    name: "Emily Brown",
    jobTitle: "UX Designer",
    profilePicture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400",
    badges: [
      {
        id: "b6",
        type: "Customer Obsessed",
        givenBy: "Mike Chen",
        givenById: "3",
        comment: "User research findings were invaluable",
        rating: 5,
        timestamp: new Date("2024-01-16"),
        reactions: [
          { userId: "1", emoji: "❤️" },
          { userId: "2", emoji: "🎉" },
        ],
      },
    ],
    totalScore: 5,
  },
  {
    id: "5",
    name: "Alex Rodriguez",
    jobTitle: "DevOps Engineer",
    profilePicture: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400",
    badges: [
      {
        id: "b7",
        type: "Documentation Dynamo",
        givenBy: "Sarah Johnson",
        givenById: "1",
        comment: "CI/CD documentation helped the whole team",
        rating: 5,
        timestamp: new Date("2024-01-18"),
        reactions: [{ userId: "3", emoji: "👍" }],
      },
      {
        id: "b8",
        type: "Most Improved",
        givenBy: "Emily Brown",
        givenById: "4",
        comment: "Kubernetes skills have grown tremendously",
        rating: 4,
        timestamp: new Date("2024-01-14"),
        reactions: [],
      },
    ],
    totalScore: 9,
  },
  {
    id: "6",
    name: "Lisa Park",
    jobTitle: "QA Engineer",
    profilePicture: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400",
    badges: [
      {
        id: "b9",
        type: "Bug Slayer",
        givenBy: "Alex Rodriguez",
        givenById: "5",
        comment: "Caught a critical edge case before release",
        rating: 5,
        timestamp: new Date("2024-01-17"),
        reactions: [
          { userId: "1", emoji: "🎉" },
          { userId: "2", emoji: "👍" },
        ],
      },
    ],
    totalScore: 5,
  },
];

export const mockUsers: User[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    email: "sarah@sprintwise.com",
    role: "Employee",
  },
  {
    id: "2",
    name: "John Doe",
    email: "john@sprintwise.com",
    role: "Team Lead",
  },
  {
    id: "3",
    name: "Admin User",
    email: "admin@sprintwise.com",
    role: "Admin",
  },
];
