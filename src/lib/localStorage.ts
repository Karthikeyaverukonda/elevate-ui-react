import { toast } from "sonner";
import { Employee, Badge, AwardType } from "@/types/employee";
import { useState, useEffect, useCallback, useRef } from "react";

export const STORAGE_KEYS = {
  USERS: "sprintwise_users_v78",
  SESSIONS: "sprintwise_sessions_v78", 
  ACTIVE_TAB_ROLE: "sprintwise_active_tab_role_v78", 
  EMPLOYEES: "sprintwise_employees_v78",
  NOMINATIONS: "sprintwise_nominations_v78",
  SPRINTS: "sprintwise_sprints_v78",
  ARTS: "sprintwise_arts_v78",
  TEAMS: "sprintwise_teams_v78",
  NOTIFICATIONS: "sprintwise_notifications_v78",
  AWARDS: "sprintwise_awards_v78",
  USER_ID: "user_id",
  USER_LOGIN: "user_login",
  USER_ROLE: "user_role",
  CURRENT_ART: "current_art"
};

const TAB_USER_KEY = "sprintwise_tab_user_v78";
const BASE_VOTE_VALUE = 50; 
const SCALING_FACTOR = 3.0;

export type UserRole = 'Admin' | 'Art Manager' | 'Employee' | 'Scrum Master';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface StoredUser {
  id: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  needsPasswordChange: boolean;
  jobTitle?: string;
  artId?: string; 
  teamId?: string; 
  createdAt: string;
  createdBy?: string;
  profilePicture?: string;
}


export interface pendingArtEmployee{
  employee_name: string;
  team_name: string;
  employee_role: string;
  image: string;
  active_status: string;
}

export interface StoredNomination {
  id: string;
  nomineeId: string;
  nominatorId: string;
  givenBy?: string; 
  awardType: AwardType;
  comment: string;
  rating: number;
  timestamp: string;
}

export interface StoredSprint {
  id: string;
  title: string;
  startDate: string; 
  endDate: string;   
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  status: 'planned' | 'active' | 'completed';
  managerId?: string; 
}

export interface StoredAward {
    award_id: string;
    award_name: string;
    award_description: string;
    award_image: string;
}

export interface ART {
  id: string;
  name: string;
  department: string;
  managerId: string;
  createdAt?: string; 
  updatedAt?: string; 
}

export interface Team {
  team_id: string;
  art_id: string;
  team_name: string;
  team_description: string;
}

export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const safeParse = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch { return fallback; }
};

const setAndSync = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("local-storage-update"));
};

const getBaseAwards = (): StoredAward[] => [

];

const initializeDefaults = () => {
  const now = new Date().toISOString();
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers: StoredUser[] = [
      { id: "user_admin", firstName: "John", lastName: "Doe", password: "John@123", role: "Admin", status: "approved", needsPasswordChange: false, createdAt: now },
      { id: "user_manager", firstName: "Steven", lastName: "Strange", password: "password123", role: "Art Manager", status: "approved", needsPasswordChange: false, createdAt: now },
    ];
    setAndSync(STORAGE_KEYS.USERS, defaultUsers);
  }
};

export const userActions = {
  updateProfilePicture: (userId: string, base64Data: string) => {
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
        users[idx].profilePicture = base64Data;
        setAndSync(STORAGE_KEYS.USERS, users);
        const tabUserStr = sessionStorage.getItem(TAB_USER_KEY);
        if (tabUserStr) {
            try {
                const tabUser = JSON.parse(tabUserStr);
                if (tabUser.id === userId) {
                    tabUser.profilePicture = base64Data;
                    sessionStorage.setItem(TAB_USER_KEY, JSON.stringify(tabUser));
                }
            } catch(e) {}
        }
        return true;
    }
    return false;
  }
};

export const auth = {
  getCurrentUser: (targetRole?: UserRole) => {
    const tabUserStr = sessionStorage.getItem(TAB_USER_KEY);
    if (tabUserStr) {
        try {
            const tabUser = JSON.parse(tabUserStr) as StoredUser;
            const allUsers = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
            const freshUser = allUsers.find(u => u.id === tabUser.id);
            if (freshUser && (!targetRole || freshUser.role === targetRole)) return freshUser;
        } catch(e) { }
    }
    return null;
  },
  signup: (firstName: string, lastName: string, password: string, role: UserRole, jobTitle?: string) => {
    initializeDefaults();
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    if (users.some(u => u.firstName.toLowerCase() === firstName.toLowerCase() && u.lastName.toLowerCase() === lastName.toLowerCase())) {
        return { success: false, error: "An account with this exact name already exists." };
    }
    const isSuperAdmin = firstName.toLowerCase() === 'john' && lastName.toLowerCase() === 'doe' && password === 'John@123' && role === 'Admin';
    
    const newUser: StoredUser = { 
      id: generateId(), firstName, lastName, password, role, jobTitle,
      status: isSuperAdmin ? 'approved' : 'pending', 
      createdAt: new Date().toISOString(), needsPasswordChange: false
    };
    users.push(newUser);
    setAndSync(STORAGE_KEYS.USERS, users);
    return { success: true };
  },
  login: (firstName: string, lastName: string, password: string, selectedRole: UserRole) => {
    initializeDefaults();
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.firstName.toLowerCase() === firstName.toLowerCase() && u.lastName.toLowerCase() === lastName.toLowerCase() && u.password === password);
    if (!user) return { success: false, error: "Invalid credentials" };
    if (user.role !== selectedRole) return { success: false, error: "Incorrect portal role selected" };
    
    if (user.status === 'pending' && user.role !== 'Employee') {
        return { success: false, error: "Account pending" };
    }
    if (user.status === 'rejected') return { success: false, error: "Account is disabled." };
    
    sessionStorage.setItem(TAB_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  },
  logout: () => {
    sessionStorage.removeItem(TAB_USER_KEY);
  }
};

export const artManagerActions = {
  getPendingEmployeesForManager: async(art_id: any) => {
      var return_data:any = [""];
      try{
      await fetch(`http://127.0.0.1:8000/api/pending-art-employees/?art_id=${art_id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'get pending employees failed');
          }
          return_data = await response.json();
          console.log("Fetched pending employees for ART:", return_data);
        })} catch(err: any){
          toast.error(err.message || 'get pending employees failed');
          return null;
        }
        console.log("reached before retrunnnnnnnnnnn")
    return return_data;
},
  
  getPendingEmployeesForScrumMaster: (artId: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      return users.filter(u => u.role === 'Employee' && u.status === 'pending' && u.artId === artId && u.jobTitle !== 'Scrum Master');
  },

  getManagedEmployees: (managerId: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
      const myArtIds = arts.filter(a => a.managerId === managerId).map(a => a.id);
      return users.filter(u => u.role === 'Employee' && (u.status === 'approved' || u.status === 'rejected') && (u.artId && myArtIds.includes(u.artId)));
  },

  approveEmployee: (userId: string, teamId: string) => {
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === userId);
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []);
    const targetTeam = teams.find(t => t.art_id === teamId);

    if (idx !== -1 && targetTeam) {
      users[idx].status = 'approved';
      users[idx].artId = targetTeam.art_id;
      users[idx].teamId = teamId;

      const employees = safeParse<any[]>(STORAGE_KEYS.EMPLOYEES, []);
      const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
      const art = arts.find(a => a.id === targetTeam.art_id);
      
      const existingEmpIdx = employees.findIndex((e: any) => e.id === userId);
      if (existingEmpIdx !== -1) {
          employees[existingEmpIdx].teamId = teamId;
      } else {
          employees.push({
              id: userId, name: `${users[idx].firstName} ${users[idx].lastName}`, jobTitle: users[idx].jobTitle || "Team Member", 
              department: art ? art.department : "Engineering", profilePicture: `https://ui-avatars.com/api/?name=${users[idx].firstName}+${users[idx].lastName}&background=random`,
              badges: [], totalScore: 0, teamId: teamId
          });
      }
      setAndSync(STORAGE_KEYS.EMPLOYEES, employees);
      setAndSync(STORAGE_KEYS.USERS, users);
      return true;
    }
    return false;
  },

  removeEmployeeFromTeam: (userId: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) {
          users[idx].teamId = undefined; 
          setAndSync(STORAGE_KEYS.USERS, users);
          const employees = safeParse<any[]>(STORAGE_KEYS.EMPLOYEES, []);
          const empIdx = employees.findIndex((e: any) => e.id === userId);
          if (empIdx !== -1) {
              employees[empIdx].teamId = undefined;
              setAndSync(STORAGE_KEYS.EMPLOYEES, employees);
          }
          return true;
      }
      return false;
  },

  getMyART: async () => {
    var return_data :any= [""]
    try{
      await fetch(`http://127.0.0.1:8000/api/art/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'get pending employees failed');
          }
          return_data = await response.json();
        })
      }catch (err: any) {
    toast.error(err?.message || "get my ART failed");
    return null;
  }
  return return_data[0];
},


  createART: (name: string, department: string, managerId: string) => {
    const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
    arts.push({ id: generateId(), name, department, managerId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setAndSync(STORAGE_KEYS.ARTS, arts);
  },
  updateART: (id: string, name: string, department: string) => {
    const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
    const idx = arts.findIndex(a => a.id === id);
    if (idx !== -1) {
        arts[idx].name = name;
        arts[idx].department = department;
        arts[idx].updatedAt = new Date().toISOString();
        setAndSync(STORAGE_KEYS.ARTS, arts);
    }
  },
  deleteART: (id: string) => {
    const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []).filter(a => a.id !== id);
    setAndSync(STORAGE_KEYS.ARTS, arts);
  },
  
  getTeams: async (art_id: string) => {
    var return_data :any= ""
    try{
      await fetch(`http://127.0.0.1:8000/api/teams/?artId=${art_id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'get teams failed');
          }
          return_data = await response.json();
          console.log("Fetched teams:", return_data);

        })
      }catch (err: any) {
    toast.error(err?.message || "get teams failed");
    return null;
  }
  return return_data;
  },
  createTeam: (artId: string, name: string, description: string) => {
    // const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []);
    // teams.push({ id: generateId(), artId, name, description });
    // setAndSync(STORAGE_KEYS.TEAMS, teams);
  },
  updateTeam: (id: string, artId: string, name: string, description: string) => {
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []);
    const idx = teams.findIndex(t => t.art_id === id);
    if (idx !== -1) {
        teams[idx].art_id = artId;
        teams[idx].team_name = name;
        teams[idx].team_description = description;
        setAndSync(STORAGE_KEYS.TEAMS, teams);
    }
  },
  deleteTeam: (id: string) => {
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []).filter(t => t.art_id !== id);
    setAndSync(STORAGE_KEYS.TEAMS, teams);

    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    let usersChanged = false;
    users.forEach(u => { if (u.teamId === id) { u.teamId = undefined; usersChanged = true; } });
    if (usersChanged) setAndSync(STORAGE_KEYS.USERS, users);

    const employees = safeParse<any[]>(STORAGE_KEYS.EMPLOYEES, []);
    let empsChanged = false;
    employees.forEach(e => { if (e.teamId === id) { e.teamId = undefined; empsChanged = true; } });
    if (empsChanged) setAndSync(STORAGE_KEYS.EMPLOYEES, employees);
  }
};

export const adminActions = {
  getAllUsers: () => safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []),
  getPendingRequests: () => safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []).filter(u => u.status === 'pending' && (u.role === 'Art Manager' || u.role === 'Admin')),
  approveUser: (id: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) { users[idx].status = 'approved'; setAndSync(STORAGE_KEYS.USERS, users); return true; }
      return false;
  },
  rejectUser: (id: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) { users[idx].status = 'rejected'; setAndSync(STORAGE_KEYS.USERS, users); return true; }
      return false;
  }
};

export const employeeActions = {
  requestTeam: (userId: string, artId: string, teamId: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) {
          users[idx].artId = artId;
          users[idx].teamId = teamId;
          users[idx].status = 'pending';
          setAndSync(STORAGE_KEYS.USERS, users);
          return true;
      }
      return false;
  },
  joinTeam: (userId: string, teamId: string) => {
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].teamId = teamId;
      const employees = safeParse<any[]>(STORAGE_KEYS.EMPLOYEES, []);
      const empIdx = employees.findIndex((e: any) => e.id === userId);
      const user = users[idx];
      const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
      const art = arts.find(a => a.id === user.artId);

      if (empIdx !== -1) {
          employees[empIdx].teamId = teamId;
      } else {
          employees.push({
            id: user.id, name: `${user.firstName} ${user.lastName}`, jobTitle: user.jobTitle || "Software Engineer", 
            department: art ? art.department : "Engineering", profilePicture: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`,
            badges: [], totalScore: 0, teamId: teamId
          });
      }
      setAndSync(STORAGE_KEYS.USERS, users);
      setAndSync(STORAGE_KEYS.EMPLOYEES, employees);
      return true;
    }
    return false;
  },
  getTeamPeers: (teamId: string, myId: string) => {
    const employees = safeParse<any[]>(STORAGE_KEYS.EMPLOYEES, []);
    return employees.filter(e => e.teamId === teamId && e.id !== myId);
  }
};

export const sprintStorage = {
  getSprints: (managerId?: string) => {
      const s = safeParse<StoredSprint[]>(STORAGE_KEYS.SPRINTS, []);
      if (!managerId) return s;
      return s.filter(x => x.managerId === managerId);
  },
  addSprint: (title: string, startDate: string, endDate: string, quarter: any, status: any, managerId: string) => {
    const s = safeParse<StoredSprint[]>(STORAGE_KEYS.SPRINTS, []);
    if (status === 'active') { s.forEach(sprint => { if (sprint.status === 'active' && sprint.managerId === managerId) sprint.status = 'completed'; }); }
    s.push({ id: generateId(), title, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), quarter, status, managerId });
    setAndSync(STORAGE_KEYS.SPRINTS, s);
  },
  updateSprint: (id: string, title: string, startDate: string, endDate: string, quarter: any, status: any, managerId: string) => {
    const s = safeParse<StoredSprint[]>(STORAGE_KEYS.SPRINTS, []);
    const idx = s.findIndex(x => x.id === id);
    if (idx !== -1) {
        if (status === 'active') { s.forEach(sprint => { if (sprint.id !== id && sprint.status === 'active' && sprint.managerId === managerId) sprint.status = 'completed'; }); }
        s[idx] = { ...s[idx], title, startDate: new Date(startDate).toISOString(), endDate: new Date(endDate).toISOString(), quarter, status };
        setAndSync(STORAGE_KEYS.SPRINTS, s);
    }
  },
  deleteSprint: (id: string) => {
      const s = safeParse<StoredSprint[]>(STORAGE_KEYS.SPRINTS, []).filter(x => x.id !== id);
      setAndSync(STORAGE_KEYS.SPRINTS, s);
  }
};
export const awardStorage = {
  getAwards: () => {
    var data : any = "";
      fetch(`http://127.0.0.1:8000/api/awards/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'get awards failed');
          }
          return response.json();
        })
        .then((data) => {
          data = data;
          }).catch((err: any) => {
          toast.error(err.message || 'get awards failed');
        });
      return data;

  },
  addAward: (name: string, description: string, image: string) => {
      fetch(`http://127.0.0.1:8000/api/awards/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({
          award_name: name.trim(),
          award_description: description.trim(),
          awards_image: image
        }),
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'add award failed');
          }
          return response.json();
        })
        .then((data) => {
          console.log("Fetched awards:", data);
          return true;
          })
          .catch((err: any) => {
          toast.error(err.message || 'add award failed');
        });
  },
  updateAward: (id: string, name: string, description: string,image:string) => {
      fetch(`http://127.0.0.1:8000/api/awards/?award_id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({
          award_name: name.trim(),
          award_description: description.trim(),
          awards_image: image
        }),
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'add award failed');
          }
          return response.json();
        })
        .then((data) => {
          console.log("Fetched awards:", data);
          return true;
          })
          .catch((err: any) => {
          toast.error(err.message || 'add award failed');
        });
  },
  deleteAward: (id: string) => {
      fetch(`http://127.0.0.1:8000/api/awards/?award_id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Signup failed');
          }
          return response.json();
        })
        .then((data) => {
            console.log("Award deleted:", data.award_name);
          }).catch((err: any) => {
          toast.error(err.message || 'Signup failed');
        });
      return true;
  }
};

export const nominationStorage = {
  getNominations: () => safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []),
  getNominationsForEmployee: (id: string) => safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []).filter(n => n.nomineeId === id),
  getNominationCountBetweenUsers: (nominatorId: string, nomineeId: string) => {
      const noms = safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []);
      return noms.filter(n => n.nominatorId === nominatorId && n.nomineeId === nomineeId).length;
  },
  addNomination: (nomineeId: string, nominatorId: string, awardType: string, comment: string, rating: number) => {
      const noms = safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []);
      noms.push({
          id: generateId(),
          nomineeId,
          nominatorId,
          awardType,
          comment,
          rating,
          timestamp: new Date().toISOString()
      });
      setAndSync(STORAGE_KEYS.NOMINATIONS, noms);
  }
};

export const employeeStorage = {
  getEmployees: () => safeParse<Employee[]>(STORAGE_KEYS.EMPLOYEES, [])
};

export const getARTById = (id: string) => safeParse<ART[]>(STORAGE_KEYS.ARTS, []).find(a => a.id === id);
export const getTeamById = (id: string) => safeParse<Team[]>(STORAGE_KEYS.TEAMS, []).find(t => t.art_id === id);