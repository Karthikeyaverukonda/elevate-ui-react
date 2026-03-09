import { Employee, Badge, AwardType } from "@/types/employee";

// VERSION UPDATE: _v76 (Clean slate for the new Admin approval workflow)
export const STORAGE_KEYS = {
  USERS: "sprintwise_users_v76",
  SESSIONS: "sprintwise_sessions_v76", 
  ACTIVE_TAB_ROLE: "sprintwise_active_tab_role_v76", 
  EMPLOYEES: "sprintwise_employees_v76",
  NOMINATIONS: "sprintwise_nominations_v76",
  SPRINTS: "sprintwise_sprints_v76",
  ARTS: "sprintwise_arts_v76",
  TEAMS: "sprintwise_teams_v76",
  NOTIFICATIONS: "sprintwise_notifications_v76",
  AWARDS: "sprintwise_awards_v76",
};

const TAB_USER_KEY = "sprintwise_tab_user_v76";

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
  status: 'locked' | 'active' | 'completed';
  managerId?: string; 
}

export interface StoredAward {
    id: string;
    type: string;
    description: string;
    icon: string;
    color?: string;
    points?: number;
    managerId?: string; 
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

const getBaseAwards = (managerId: string): StoredAward[] => [
    { id: `aw_1_${managerId}`, type: "Culture Champion", icon: "Heart", color: "#e11d48", description: "Promoting positive team culture", points: 50, managerId },
    { id: `aw_2_${managerId}`, type: "Bug Slayer", icon: "Sword", color: "#dc2626", description: "Fixing critical issues", points: 30, managerId },
    { id: `aw_3_${managerId}`, type: "Team Player", icon: "Users", color: "#2563eb", description: "Helping others succeed", points: 40, managerId },
    { id: `aw_4_${managerId}`, type: "Innovator", icon: "Lightbulb", color: "#d97706", description: "Creative solutions", points: 60, managerId },
    { id: `aw_5_${managerId}`, type: "Customer Hero", icon: "Smile", color: "#059669", description: "Going above and beyond for clients", points: 50, managerId },
    { id: `aw_6_${managerId}`, type: "Early Bird", icon: "Sunrise", color: "#f59e0b", description: "First to start, always prepared", points: 20, managerId },
    { id: `aw_7_${managerId}`, type: "Night Owl", icon: "Moon", color: "#4338ca", description: "Dedication beyond standard hours", points: 20, managerId },
    { id: `aw_8_${managerId}`, type: "Code Wizard", icon: "Wand2", color: "#7c3aed", description: "Exceptional technical problem solving", points: 45, managerId },
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
      status: isSuperAdmin ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
      needsPasswordChange: false
    };
    
    users.push(newUser);
    setAndSync(STORAGE_KEYS.USERS, users);
    return { success: true };
  },
  
  login: (firstName: string, lastName: string, password: string, selectedRole: UserRole) => {
    initializeDefaults();
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    
    const user = users.find(u => 
        u.firstName.toLowerCase() === firstName.toLowerCase() && 
        u.lastName.toLowerCase() === lastName.toLowerCase() && 
        u.password === password
    );

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

  approveEmployee: (userId: string, artId: string) => {
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].status = 'approved';
      users[idx].artId = artId;

      const hasDummies = users.some(u => u.artId === artId && u.createdBy === "system_dummy");
      
      if (!hasDummies) {
          const employees = safeParse<any[]>(STORAGE_KEYS.EMPLOYEES, []);
          const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
          const art = arts.find(a => a.id === artId);
          const dept = art ? art.department : "Engineering";
          const now = new Date().toISOString();
          
          DUMMY_PROFILES.forEach((dummy, i) => {
              const dummyId = `dummy_${artId}_${i}`; 
              users.push({
                  id: dummyId, firstName: dummy.f, lastName: dummy.l, password: "dummy", 
                  role: "employee", status: "approved", needsPasswordChange: false, 
                  artId: artId, teamId: undefined, createdAt: now, createdBy: "system_dummy"
              });
              
              employees.push({
                  id: dummyId, name: `${dummy.f} ${dummy.l}`, jobTitle: "Software Engineer", 
                  department: dept, profilePicture: dummy.img,
                  badges: [], totalScore: 0, teamId: undefined
              });
          });
          setAndSync(STORAGE_KEYS.EMPLOYEES, employees);
      }

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

  createART: (name: string, department: string, managerId: string) => {
    const arts = safeParse<ART[]>(STORAGE_KEYS.ARTS, []);
    const now = new Date().toISOString();
    arts.push({ id: `art_${Date.now()}`, name, department, managerId, createdAt: now, updatedAt: now });
    setAndSync(STORAGE_KEYS.ARTS, arts);
  },
  getARTs: () => safeParse<ART[]>(STORAGE_KEYS.ARTS, []),
  
  createTeam: (artId: string, name: string, description: string) => {
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []);
    const newTeamId = `team_${Date.now()}`;
    teams.push({ id: newTeamId, artId, name, description });
    setAndSync(STORAGE_KEYS.TEAMS, teams);
  },

  getTeams: () => safeParse<Team[]>(STORAGE_KEYS.TEAMS, []),
  
  deleteTeam: (id: string) => {
    const teams = safeParse<Team[]>(STORAGE_KEYS.TEAMS, []).filter(t => t.id !== id);
    setAndSync(STORAGE_KEYS.TEAMS, teams);

    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    let usersChanged = false;
    users.forEach(u => {
        if (u.teamId === id) {
            u.teamId = undefined;
            usersChanged = true;
        }
    });
    if (usersChanged) setAndSync(STORAGE_KEYS.USERS, users);

    const employees = safeParse<any[]>(STORAGE_KEYS.EMPLOYEES, []);
    let empsChanged = false;
    employees.forEach(e => {
        if (e.teamId === id) {
            e.teamId = undefined;
            empsChanged = true;
        }
    });
    if (empsChanged) setAndSync(STORAGE_KEYS.EMPLOYEES, employees);
  },
  
  getEnrollmentCount: (teamId: string) => {
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    return users.filter(u => u.teamId === teamId).length;
  }
};

export const adminActions = {
  getAllUsers: () => safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []),
  
  getPendingRequests: () => {
      const allUsers = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      return allUsers.filter(u => u.status === 'pending' && (u.role === 'art-manager' || u.role === 'admin'));
  },
  
  approveUser: (id: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) { 
          users[idx].status = 'approved'; 
          setAndSync(STORAGE_KEYS.USERS, users); 
          return true; 
      }
      return false;
  },
  rejectUser: (id: string) => {
      const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
      const idx = users.findIndex(u => u.id === id);
      if (idx !== -1) { 
          users[idx].status = 'rejected'; 
          setAndSync(STORAGE_KEYS.USERS, users); 
          return true; 
      }
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
      
      let mySprints = s.filter(x => x.managerId === managerId);
      
      if (mySprints.length === 0) {
          const year = new Date().getFullYear();
          const newSprint: StoredSprint = { 
              id: `sp_${Date.now()}_${managerId}`, 
              title: "Sprint 1 (Initial Phase)", 
              startDate: new Date(year, 0, 1).toISOString(), 
              endDate: new Date(year, 2, 31, 23, 59, 59).toISOString(), 
              status: 'active', 
              managerId 
          };
          s.push(newSprint);
          setAndSync(STORAGE_KEYS.SPRINTS, s);
          mySprints = [newSprint];
      }
      
      return mySprints;
  },
  addSprint: (title: string, startDate: string, endDate: string, managerId: string) => {
    const s = safeParse<StoredSprint[]>(STORAGE_KEYS.SPRINTS, []);
    
    s.forEach(sprint => {
        if (sprint.status === 'active' && sprint.managerId === managerId) {
            sprint.status = 'completed';
        }
    });

    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999); 

    s.push({ 
        id: `sp_${Date.now()}`, 
        title, 
        startDate: new Date(startDate).toISOString(), 
        endDate: endDateTime.toISOString(), 
        status: 'active', 
        managerId 
    });
    setAndSync(STORAGE_KEYS.SPRINTS, s);
  }
};

export const awardStorage = {
  getAwards: (managerId?: string) => {
      const a = safeParse<StoredAward[]>(STORAGE_KEYS.AWARDS, []);
      if (!managerId) return a;
      
      let myAwards = a.filter(x => x.managerId === managerId);
      
      if (myAwards.length === 0) {
          const newAwards = getBaseAwards(managerId);
          a.push(...newAwards);
          setAndSync(STORAGE_KEYS.AWARDS, a);
          myAwards = newAwards;
      }
      
      return myAwards;
  },
  addAward: (type: string, description: string = "Special Recognition", managerId: string) => {
    const a = safeParse<StoredAward[]>(STORAGE_KEYS.AWARDS, []);
    const colors = ["#8b5cf6", "#14b8a6", "#f43f5e", "#0ea5e9", "#f59e0b"]; 
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    a.push({ id: `aw_${Date.now()}`, type, description, icon: "Star", color: randomColor, points: 50, managerId });
    setAndSync(STORAGE_KEYS.AWARDS, a);
  },
  deleteAward: (id: string) => {
    const a = safeParse<StoredAward[]>(STORAGE_KEYS.AWARDS, []).filter(x => x.id !== id);
    setAndSync(STORAGE_KEYS.AWARDS, a);
  }
};

export const nominationStorage = {
  addNomination: (nomineeId: string, nominatorId: string, awardType: string, comment: string, rating: number) => {
    const nominations = safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []);
    const employees = safeParse<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
    const users = safeParse<StoredUser[]>(STORAGE_KEYS.USERS, []);
    
    const nominee = employees.find((e: any) => e.id === nomineeId);
    if (!nominee) return;
    
    const nominatorUser = users.find(u => u.id === nominatorId);
    const nominatorName = nominatorUser ? `${nominatorUser.firstName} ${nominatorUser.lastName}` : "A Peer";

    let potentialVoters = 1; 
    if (nominee.teamId) {
        const teamMembers = users.filter((u: any) => u.teamId === nominee.teamId);
        potentialVoters = Math.max(1, teamMembers.length - 1); 
    }
    
    const fairnessMultiplier = SCALING_FACTOR / Math.sqrt(potentialVoters);
    const weightedPoints = Math.round(BASE_VOTE_VALUE * fairnessMultiplier);
    
    const newNom: StoredNomination = { 
        id: `nom_${Date.now()}`, 
        nomineeId, 
        nominatorId, 
        givenBy: nominatorName, 
        awardType: awardType as AwardType, 
        comment, 
        rating, 
        timestamp: new Date().toISOString() 
    };
    
    nominations.push(newNom);
    setAndSync(STORAGE_KEYS.NOMINATIONS, nominations);
    nominee.totalScore = (nominee.totalScore || 0) + weightedPoints;
    setAndSync(STORAGE_KEYS.EMPLOYEES, employees);
    return newNom;
  },
  getNominations: () => safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []),
  getNominationsForEmployee: (id: string) => safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []).filter(n => n.nomineeId === id),
  hasUserNominatedForAward: (userId: string, awardType: string) => safeParse<StoredNomination[]>(STORAGE_KEYS.NOMINATIONS, []).some(n => n.nominatorId === userId && n.awardType === awardType)
};

export const employeeStorage = {
  getEmployees: () => safeParse<Employee[]>(STORAGE_KEYS.EMPLOYEES, [])
};

export const getARTById = (id: string) => safeParse<ART[]>(STORAGE_KEYS.ARTS, []).find(a => a.id === id);
export const getTeamById = (id: string) => safeParse<Team[]>(STORAGE_KEYS.TEAMS, []).find(t => t.id === id);