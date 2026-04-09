import { Key } from "node_modules/react-hook-form/dist/types/path/common";

export const STORAGE_KEYS = {
  USER_ID: "user_id",
  USER_LOGIN: "user_login",
  USER_ROLE: "user_role",
  ART_ID: "art_id",
};

export type UserRole = 'Admin' | 'Art Manager' | 'Employee' | 'Scrum Master';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  user_id: string;
  last_login: string;
  user_login: string;
  user_role: string;
  user_firstname: string;
  user_lastname: string;
  user_image: string;
  is_active: boolean;
  is_staff: boolean;
  no_of_points: number;
  no_of_awards: number;
}

export interface pendingArtEmployee {
  employee_id: string;
  team_id: string;
  employee_name: string;
  team_name: string;
  employee_role: string;
  image: string;
  active_status: boolean;
}

export interface pendingArtManager {
  user_id: string;
  user_name: string;
  user_role: string;
  status: string;
}

export interface Sprint {
  sprint_id: string;
  sprint_name: string;
  art : string;
  year: string;
  start_date: string;
  end_date: string;
  quater: '1' | '2' | '3' | '4';
  status: 'Planned' | 'Active' | 'Completed';
  updated_at: Date;
  created_at: Date;
}

export interface Award {
  award_id: string;
  award_name: string;
  award_description: string;
  award_image: string;
  created_at: Date;
  updated_at: Date;
}

export interface ART {
  art_id: string;
  art_name: string;
  user: string;
  department: string;
  created_at: Date;
  updated_at: Date;
  art_manager_name: string;
  art_manager_image: string;
}

export interface Team {
  team_id: string;
  art: string;
  team_name: string;
  team_description: string;
  created_at: Date;
  updated_at: Date;
}

export interface MyArtEmployee{
    employee_id: string;
    employee_name: string;
    employee_role: string;
    team_name: string;
    image: string;
    active_status: string;
    total_awards: number;
    total_points: number;
}

export interface UserProfileData{
    employee_id: string;
    employee_name: string;
    team_name: string;
    employee_role: string;
    image: string;
    total_points: number;
    total_awards: number;
    active_status: string;
    art_id: string;
    art_name: string;
}


export interface TeamMemberDataForNominations{
    employee_id: string;
    employee_name: string;
    team_name: string;
    employee_role: string;
    employee_image: string;
}

export interface AwardsUsed{
    award_id: string;
    award_name: string;
    award_description: string;
}

export interface FetUsersCurrentSprintNomiationDataResponse{
    sprint_id: string;
    sprint_name: string;
    awards_already_used: AwardsUsed[];
    user_team_members: TeamMemberDataForNominations[];
    other_team_members: TeamMemberDataForNominations[];
}


export interface AdminDashboardData {
  total_users: number;
  total_arts: number;
  total_teams: number;
  all_time_nominations: number;
}

export interface RegisteredARTManager {
  user_id: Key | null | undefined;
  user_name: string;
  user_role: string;
  art_name: string;
  department: string;
  status: string;
  user_login: string;
}

export interface ArtsAndTeamsData {
  art_id: string;
  art_name: string;
  art_manager: string;
  department: string;
  teams: {
    team_id: string;
    team_name: string;
  }[];
}


export interface ArtChampion {
  employee_name: string;
  employee_image: string;
  no_of_nominations_received: number;
  most_received_award_name: string;
}

export interface OrganizationChampion extends ArtChampion {
  team_name: string;
  art_name: string;
  department: string;
}

export interface UserHomePageData {
  last_sprint_top5_champions_in_your_art: ArtChampion[];
  art_level_champions_top5: ArtChampion[];
  organization_level_champions_top5_till_now: OrganizationChampion[];
  total_nominations_done_in_last_day: number;
  total_active_Employees: number;
}
export interface TeamLevelLeaderboardResponse {
  employeename: string;
  image: string;
  total_awards: number;
  total_no_of_points: number;

  List_of_awards: {
    award_name: string;
    award_image: string;
    total_nomniations_for_award: number;
    nominations_information: {
    nominator: string;
    nomination_date: string;
    comments: string;
    }[];
  }[];
}
export interface ARTLevelLeaderboardResponse {
  employeename: string;
  image: string;
  total_awards: number;
  total_no_of_points: number;

  List_of_awards: {
    award_name: string;
    award_image: string;
    total_nomniations_for_award: number;
    nominations_information: {
    nominator: string;
    nomination_date: string;
    comments: string;
    }[];
  }[];
}

//TODO
// create nomination response

