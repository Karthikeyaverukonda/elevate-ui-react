import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, Calendar, Trash2, Check, X, Clock, Map, UserMinus, Trophy, LogOut, Settings2, Edit, Ban, CheckCircle, Camera, Search, LayoutDashboard, ChevronRight, Zap, RefreshCw, Network, Plus, Award, AlertTriangle } from "lucide-react";
import { auth, artManagerActions, adminActions, sprintStorage, employeeStorage, nominationStorage, awardStorage, StoredUser, ART, Team, StoredSprint, STORAGE_KEYS, userActions,pendingArtEmployee } from "@/lib/localStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@/types/employee";
import { title } from "process";
import { set } from "date-fns";

const SCALING_FACTOR = 3.0;
const BASE_VOTE_VALUE = 50;

interface ManagedUserWithScore extends StoredUser {
    totalScore?: number;
    totalAwards?: number;
    jobTitle?: string;
}

type ManagerTab = 'overview' | 'requests' | 'arts' | 'teams' | 'members' | 'sprints';

interface WarningModalState {
    isOpen: boolean;
    title: string;
    message: string;
    actionLabel: string;
    actionTab: ManagerTab;
}

const getDisplayName = (u: any) => {
    if (!u) return 'Unknown User';
    if (u.name && !u.firstName) return u.name;
    const first = u.firstName || '';
    const last = u.lastName || '';
    const combined = `${first} ${last}`.trim();
    if (!combined) return 'Unknown User';
    
    if (combined.toLowerCase() === 'system admin') return 'Alice (Admin)';
    if (combined.toLowerCase() === 'tech lead') return 'Bob (Manager)';
    if (combined.toLowerCase() === 'scrum master') return 'Charlie (Scrum Master)';
    
    return combined;
};

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ManagerTab>('overview');
  
  const [pendingEmployees, setPendingEmployees] = useState("");
  const [managedEmployees, setManagedEmployees] = useState<ManagedUserWithScore[]>([]);
  const [arts, setArts] = useState<ART[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sprints, setSprints] = useState<StoredSprint[]>([]);

  // Search States
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  
  const [approvalTeamSelections, setApprovalTeamSelections] = useState<Record<string, string>>({});

  const [warningModal, setWarningModal] = useState<WarningModalState | null>(null);
  const [isArtModalOpen, setIsArtModalOpen] = useState(false);
  const [editingArt, setEditingArt] = useState<ART | null>(null);
  const [artForm, setArtForm] = useState({ name: '', department: '' });

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({ artId: '', name: '', description: '' });

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<StoredSprint | null>(null);
  const [sprintForm, setSprintForm] = useState({ title: '', startDate: '', endDate: '', quarter: 'Q1', status: 'planned' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  //useCallback for loadData to prevent unnecessary re-renders
  const loadData = useCallback(async (managerId: any) => {
    const myArt = await artManagerActions.getMyART();
    if (!myArt) {
        console.error("getMyART returned nothing");
        return;
    }
    localStorage.setItem(STORAGE_KEYS.CURRENT_ART, JSON.stringify(myArt));
    const pendingEmployees = await artManagerActions.getPendingEmployeesForManager(myArt.art_id);
    setPendingEmployees(pendingEmployees);
    console.log("Pending Employees:",pendingEmployees);
    

    const myArtTeams = await artManagerActions.getTeams(myArt.art_id);
    setTeams(myArtTeams);

    const loadedSprints = sprintStorage.getSprints(managerId);
    setSprints(loadedSprints);

    const systemAwards = await awardStorage.getAwards();
    console.log("System Awards:", systemAwards);
    const allLegacyEmployees = employeeStorage.getEmployees();
    
    // Single Source of Truth for unified calculations
    const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    const rawEmps = artManagerActions.getManagedEmployees(managerId);
    
    const activeS = loadedSprints.find(s => s.status === 'active') || loadedSprints[loadedSprints.length - 1];

    const empsWithScores = rawEmps.map(emp => {
        const empRecord = allLegacyEmployees.find(e => e.id === emp.id);
        const empBadges = nominationStorage.getNominationsForEmployee(emp.id);

        let sprintScore = 0;

        if (activeS) {
            // Precise End-Of-Day Bounds
            const activeStart = new Date(activeS.startDate).setHours(0,0,0,0);
            const activeEnd = new Date(activeS.endDate).setHours(23,59,59,999);
            
            const currentSprintBadges = empBadges.filter(n => {
                const d = new Date(n.timestamp).getTime();
                return activeS.status === 'active' ? (d >= activeStart) : (d >= activeStart && d <= activeEnd);
            });

            // Backend-Ready Damped Square Calculation
            const teamSize = allUsers.filter((u: any) => u.teamId === emp.teamId && u.status === 'approved').length;
            const potentialVoters = Math.max(1, teamSize - 1); 
            const fairnessMultiplier = SCALING_FACTOR / Math.sqrt(potentialVoters);
            
            currentSprintBadges.forEach(badge => {
                const awardDef = systemAwards.find();
                const basePoints = awardDef?.points || BASE_VOTE_VALUE;
                sprintScore += Math.round(basePoints * fairnessMultiplier);
            });
        }

        return { 
            ...emp, 
            totalScore: sprintScore, 
            totalAwards: empBadges.length,
            jobTitle: empRecord?.jobTitle || emp.jobTitle || 'Team Member'
        };
    });

    setManagedEmployees(empsWithScores);
  }, []);

  useEffect(() => {
    const user_role = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    const user_id = localStorage.getItem(STORAGE_KEYS.USER_ID); 

    if (user_role !== 'Art Manager') {
        navigate("/");
        return;
    }
    loadData(user_id);

    return () => {
        // clearInterval(interval);
        // window.removeEventListener('storage', handleStorageChange);
        // window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, [navigate, loadData]);

  const handleApprove = (id: string, presetTeamId?: string) => {
    if (teams.length === 0) {
         setWarningModal({
             isOpen: true,
             title: "Team Required",
             message: "You must create at least one Team to assign this employee to before approving their access.",
             actionLabel: "Create Team Now",
             actionTab: "teams"
         });
         return;
    }
    
    const teamToAssign = presetTeamId || approvalTeamSelections[id] || teams[0].team_id;
    
    if(artManagerActions.approveEmployee(id, teamToAssign)) {
        toast.success(`Employee approved & assigned to team!`);
        loadData(currentUser.id);
    }
  };

  const handleReject = (id: string) => {
    if(adminActions.rejectUser(id)) {
        toast.success("Request rejected");
        loadData(currentUser.id);
    }
  };

  const toggleEmployeeStatus = (emp: ManagedUserWithScore) => {
      const name = getDisplayName(emp);
      if (emp.status === 'approved') {
          adminActions.rejectUser(emp.id);
          artManagerActions.removeEmployeeFromTeam(emp.id);
          toast.success(`${name} has been disabled.`);
      } else {
          adminActions.approveUser(emp.id);
          toast.success(`${name} access restored. Please re-assign them to a team.`);
      }
      loadData(currentUser.id);
  };

  const handleSaveART = (e: React.FormEvent) => {
      e.preventDefault();
      if (!artForm.name.trim() || !artForm.department.trim()) return toast.error("Fill all fields.");
      
      if (editingArt) {
          artManagerActions.updateART(editingArt.id, artForm.name, artForm.department);
          toast.success("ART Updated");
      } else {
          artManagerActions.createART(artForm.name, artForm.department, currentUser.id);
          toast.success("ART Created");
      }
      setIsArtModalOpen(false);
      loadData(currentUser.id);
  };

  const handleDeleteART = (id: string) => {
      artManagerActions.deleteART(id);
      toast.success("ART Deleted");
      loadData(currentUser.id);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
      e.preventDefault();
      const assignedArtId = editingTeam ? teamForm.artId : (arts[0]?.id || "");
      if (!teamForm.name.trim() || !assignedArtId) return toast.error("Team requires a Name and an assigned ART.");
      
      if (editingTeam) {
          artManagerActions.updateTeam(editingTeam.team_id, assignedArtId, teamForm.name, teamForm.description);
          toast.success("Team Updated");
      } else {
          artManagerActions.createTeam(assignedArtId, teamForm.name, teamForm.description);
          toast.success("Team Created");
      }
      setIsTeamModalOpen(false);``
      loadData(currentUser.id);
  };

  const handleDeleteTeam = (id: string) => {
      artManagerActions.deleteTeam(id);
      toast.success("Team Deleted");
      loadData(currentUser.id);
  };

  const handleSaveSprint = (e: React.FormEvent) => {
      e.preventDefault();
      if (!sprintForm.title.trim() || !sprintForm.startDate || !sprintForm.endDate) return toast.error("Fill all fields.");
      if (new Date(sprintForm.startDate) > new Date(sprintForm.endDate)) return toast.error("Start date must be before end date.");

      if (editingSprint) {
          sprintStorage.updateSprint(editingSprint.id, sprintForm.title, sprintForm.startDate, sprintForm.endDate, sprintForm.quarter, sprintForm.status, currentUser.id);
          toast.success("Sprint Updated");
      } else {
          sprintStorage.addSprint(sprintForm.title, sprintForm.startDate, sprintForm.endDate, sprintForm.quarter, sprintForm.status, currentUser.id);
          toast.success("Sprint Created");
      }
      setIsSprintModalOpen(false);
      loadData(currentUser.id);
  };

  const handleDeleteSprint = (id: string) => {
      sprintStorage.deleteSprint(id);
      toast.success("Sprint Deleted");
      loadData(currentUser.id);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) return toast.error("Image is too large (Max 1MB).");
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              if (currentUser && userActions.updateProfilePicture(currentUser.id, base64String)) {
                  setCurrentUser({ ...currentUser, profilePicture: base64String });
                  toast.success("Profile picture updated!");
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const filteredTeams = teams.filter(t => 
      t.team_name.toLowerCase().includes(teamSearch.toLowerCase()) || 
      (t.team_description && t.team_description.toLowerCase().includes(teamSearch.toLowerCase()))
  );

  const filteredMembers = managedEmployees.filter(emp => 
      getDisplayName(emp).toLowerCase().includes(employeeSearch.toLowerCase()) ||
      (emp.jobTitle && emp.jobTitle.toLowerCase().includes(employeeSearch.toLowerCase()))
  );

  return (
    //manager dashboard title
    <div className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Manager Dashboard</h1>
    </div>    
  );
};

export default ManagerDashboard;