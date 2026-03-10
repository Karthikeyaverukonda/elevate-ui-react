import { Employee, Badge, AwardType } from "@/types/employee";

// VERSION UPDATE: _v78 (Added full CRUD for ARTs, Teams, Sprints & Quarter support)
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
};

const TAB_USER_KEY = "sprintwise_tab_user_v78";

const BASE_VOTE_VALUE = 50; 
const SCALING_FACTOR = 3.0;

export type UserRole = 'admin' | 'art-manager' | 'employee';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface StoredUser {
  id: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  needsPasswordChange: boolean;
  artId?: string; 
  teamId?: string; 
  createdAt: string;
  createdBy?: string;
  profilePicture?: string;
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
    id: string;
    type: string;
    description: string;
    icon: string;
    color?: string;
    points?: number;
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
  id: string;
  artId: string;
  name: string;
  description: string;
}

const safeParse = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch { return fallback; }
};

const setAndSync = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event("local-storage-update"));
};

const DUMMY_PROFILES = [
  { f: "Carol", l: "Brown", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face" },
  { f: "David", l: "Miller", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face" },
  { f: "Eve", l: "Davis", img: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face" },
  { f: "Frank", l: "Green", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face" },
  { f: "Grace", l: "Harris", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face" },
  { f: "Henry", l: "Martin", img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" }
];

const getBaseAwards = (): StoredAward[] => [
    { id: `aw_1_global`, type: "Culture Champion", icon: "Heart", color: "#e11d48", description: "Promoting positive team culture", points: 50 },
    { id: `aw_2_global`, type: "Bug Slayer", icon: "Sword", color: "#dc2626", description: "Fixing critical issues", points: 30 },
    { id: `aw_3_global`, type: "Team Player", icon: "Users", color: "#2563eb", description: "Helping others succeed", points: 40 },
    { id: `aw_4_global`, type: "Innovator", icon: "Lightbulb", color: "#d97706", description: "Creative solutions", points: 60 },
    { id: `aw_5_global`, type: "Customer Hero", icon: "Smile", color: "#059669", description: "Going above and beyond for clients", points: 50 },
];

const initializeDefaults = () => {
  const now = new Date().toISOString();
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const defaultUsers: StoredUser[] = [
      { id: "user_admin", firstName: "John", lastName: "Doe", password: "John@123", role: "admin", status: "approved", needsPasswordChange: false, createdAt: now },
      { id: "user_manager", firstName: "Steven", lastName: "Strange", password: "password123", role: "art-manager", status: "approved", needsPasswordChange: false, createdAt: now },
    ];
    
    const defaultEmployees: any[] = [];
    const defaultArtId = "art_default_1";
    const defaultTeamId = "team_default_1";

    DUMMY_PROFILES.forEach((dummy, i) => {
        const dummyId = `dummy_sys_${i}`;
        defaultUsers.push({
            id: dummyId, firstName: dummy.f, lastName: dummy.l, password: "dummy", 
            role: "employee", status: "approved", needsPasswordChange: false, 
            artId: defaultArtId, teamId: defaultTeamId, createdAt: now, createdBy: "system_dummy"
        });
        
        defaultEmployees.push({
            id: dummyId, name: `${dummy.f} ${dummy.l}`, jobTitle: "Software Engineer", 
            department: "Engineering", profilePicture: dummy.img,
            badges: [], totalScore: 0, teamId: defaultTeamId
        });
    });

    setAndSync(STORAGE_KEYS.USERS, defaultUsers);
    setAndSync(STORAGE_KEYS.EMPLOYEES, defaultEmployees);
    setAndSync(STORAGE_KEYS.ARTS, [
        { id: defaultArtId, name: "Platform Engineering", department: "Engineering", managerId: "user_manager", createdAt: now, updatedAt: now }
    ]);
    setAndSync(STORAGE_KEYS.TEAMS, [
        { id: defaultTeamId, artId: defaultArtId, name: "Frontend Ninjas", description: "Core UI/UX Team" }
    ]);
    setAndSync(STORAGE_KEYS.SPRINTS, [
        { id: `sp_default_1`, title: "Q1 Launch Phase", startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(), endDate: new Date(new Date().getFullYear(), 2, 31).toISOString(), quarter: 'Q1', status: 'active', managerId: "user_manager" }
    ]);
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
            if (freshUser && (!targetRole || freshUser.role === targetRole)) {
                return freshUser;
            }
        } catch(e) { }
    }
    return null;
  },
  signup: (firstName: string, lastName: string, password: string, role: UserRole) => {
    initializeDefaults();
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    if (users.some(u => u.firstName.toLowerCase() === firstName.toLowerCase() && u.lastName.toLowerCase() === lastName.toLowerCase())) {
        return { success: false, error: "An account with this exact name already exists. Please use a unique name." };
    }
    const isSuperAdmin = firstName.toLowerCase() === 'john' && lastName.toLowerCase() === 'doe' && password === 'John@123' && role === 'admin';
    const newUser: StoredUser = { 
      id: `user_${Date.now()}`, firstName, lastName, password, role, 
      status: isSuperAdmin ? 'approved' : 'pending', createdAt: new Date().toISOString(), needsPasswordChange: false
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
    if (user.status === 'pending') return { success: false, error: "Account pending" };
    if (user.status !== 'approved') return { success: false, error: "Account is not active. Please contact the administrator." };
    sessionStorage.setItem(TAB_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  },
  logout: () => {
    sessionStorage.removeItem(TAB_USER_KEY);
  }
};

export const artManagerActions = {
  getPendingEmployees: () => safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []).filter(u => u.role === 'employee' && u.status === 'pending'),
  getManagedEmployees: (managerId: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
      const myArtIds = arts.filter(a => a.managerId === managerId).map(a => a.id);
      return users.filter(u => u.role === 'employee' && (u.status === 'approved' || u.status === 'rejected') && (u.createdBy === managerId || (u.artId && myArtIds.includes(u.artId))));
  },

  approveEmployee: (userId: string, teamId: string) => {
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === userId);
    
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []);
    const targetTeam = teams.find(t => t.id === teamId);

    if (idx !== -1 && targetTeam) {
      users[idx].status = 'approved';
      users[idx].artId = targetTeam.artId;
      users[idx].teamId = teamId;

      const employees = safeParse<any[]>(STORAGE_KEYS.EMPLOYEES, []);
      const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
      const art = arts.find(a => a.id === targetTeam.artId);
      
      const existingEmpIdx = employees.findIndex((e: any) => e.id === userId);
      if (existingEmpIdx !== -1) {
          employees[existingEmpIdx].teamId = teamId;
      } else {
          employees.push({
              id: userId, name: `${users[idx].firstName} ${users[idx].lastName}`, jobTitle: "Team Member", 
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

  getARTs: () => safeParse<ART[]>(STORAGE_KEYS.ARTS, []),
  createART: (name: string, department: string, managerId: string) => {
    const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
    arts.push({ id: `art_${Date.now()}`, name, department, managerId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
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
    // Cascade delete teams? Or leave them orphaned. Filtering out orphaned teams on read is safer.
  },
  
  getTeams: () => safeParse<Team[]>(STORAGE_KEYS.TEAMS, []),
  createTeam: (artId: string, name: string, description: string) => {
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []);
    teams.push({ id: `team_${Date.now()}`, artId, name, description });
    setAndSync(STORAGE_KEYS.TEAMS, teams);
  },
  updateTeam: (id: string, artId: string, name: string, description: string) => {
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []);
    const idx = teams.findIndex(t => t.id === id);
    if (idx !== -1) {
        teams[idx].artId = artId;
        teams[idx].name = name;
        teams[idx].description = description;
        setAndSync(STORAGE_KEYS.TEAMS, teams);
    }
  },
  deleteTeam: (id: string) => {
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []).filter(t => t.id !== id);
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
  getPendingRequests: () => safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []).filter(u => u.status === 'pending' && (u.role === 'art-manager' || u.role === 'admin')),
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
            id: user.id, name: `${user.firstName} ${user.lastName}`, jobTitle: "Software Engineer", 
            department: art ? art.department : "Engineering", profilePicture: `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=random`,
            badges: [], totalScore: 0, teamId: teamId
          });
      }

      const unassignedDummies = users.filter(u => u.artId === user.artId && u.createdBy === "system_dummy" && !u.teamId);
      unassignedDummies.forEach(d => {
          d.teamId = teamId;
          const dEmpIdx = employees.findIndex(e => e.id === d.id);
          if (dEmpIdx !== -1) employees[dEmpIdx].teamId = teamId;
      });

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
    
    if (status === 'active') {
        s.forEach(sprint => {
            if (sprint.status === 'active' && sprint.managerId === managerId) {
                sprint.status = 'completed';
            }
        });
    }

    s.push({ 
        id: `sp_${Date.now()}`, 
        title, 
        startDate: new Date(startDate).toISOString(), 
        endDate: new Date(endDate).toISOString(), 
        quarter,
        status, 
        managerId 
    });
    setAndSync(STORAGE_KEYS.SPRINTS, s);
  },
  updateSprint: (id: string, title: string, startDate: string, endDate: string, quarter: any, status: any, managerId: string) => {
    const s = safeParse<StoredSprint[]>(STORAGE_KEYS.SPRINTS, []);
    const idx = s.findIndex(x => x.id === id);
    if (idx !== -1) {
        if (status === 'active') {
            s.forEach(sprint => {
                if (sprint.id !== id && sprint.status === 'active' && sprint.managerId === managerId) {
                    sprint.status = 'completed';
                }
            });
        }
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
      const a = safeParse<StoredAward[]>(STORAGE_KEYS.AWARDS, []);
      if (a.length === 0) {
          const newAwards = getBaseAwards();
          setAndSync(STORAGE_KEYS.AWARDS, newAwards);
          return newAwards;
      }
      return a;
  }
};

export const nominationStorage = {
  getNominations: () => safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []),
  getNominationsForEmployee: (id: string) => safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []).filter(n => n.nomineeId === id)
};

export const employeeStorage = {
  getEmployees: () => safeParse<Employee[]>(STORAGE_KEYS.EMPLOYEES, [])
};

export const getARTById = (id: string) => safeParse<ART[]>(STORAGE_KEYS.ARTS, []).find(a => a.id === id);
export const getTeamById = (id: string) => safeParse<Team[]>(STORAGE_KEYS.TEAMS, []).find(t => t.id === id);