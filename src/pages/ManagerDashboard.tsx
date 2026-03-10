import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, Briefcase, Calendar, Trash2, Check, X, Clock, Map, UserMinus, Trophy, LogOut, Settings2, Edit, Ban, CheckCircle, Camera, Search, LayoutDashboard, ChevronRight, Zap, RefreshCw, Network, Plus, Award } from "lucide-react";
import { auth, artManagerActions, adminActions, sprintStorage, employeeStorage, nominationStorage, StoredUser, ART, Team, StoredSprint, STORAGE_KEYS, userActions } from "@/lib/localStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@/types/employee";

const SCALING_FACTOR = 3.0;
const BASE_VOTE_VALUE = 50;

interface ManagedUserWithScore extends StoredUser {
    totalScore?: number;
    totalAwards?: number;
    jobTitle?: string;
}

type ManagerTab = 'overview' | 'requests' | 'arts' | 'teams' | 'members' | 'sprints';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ManagerTab>('overview');
  
  const [pendingEmployees, setPendingEmployees] = useState<StoredUser[]>([]);
  const [managedEmployees, setManagedEmployees] = useState<ManagedUserWithScore[]>([]);
  const [allEmployeesList, setAllEmployeesList] = useState<Employee[]>([]); 
  const [arts, setArts] = useState<ART[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sprints, setSprints] = useState<StoredSprint[]>([]);

  const [employeeSearch, setEmployeeSearch] = useState("");

  const [approvalTeamSelections, setApprovalTeamSelections] = useState<Record<string, string>>({});

  const [managingTeam, setManagingTeam] = useState<Team | null>(null);

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

  const loadData = useCallback((managerId: string) => {
    setPendingEmployees(artManagerActions.getPendingEmployees());
    
    const allArts = artManagerActions.getARTs();
    const myArts = allArts.filter(a => a.managerId === managerId);
    setArts(myArts);

    const allTeams = artManagerActions.getTeams();
    const myTeams = allTeams.filter(t => myArts.some(a => a.id === t.artId));
    setTeams(myTeams);

    const loadedSprints = sprintStorage.getSprints(managerId);
    setSprints(loadedSprints);

    const activeS = loadedSprints.find(s => s.status === 'active') || loadedSprints[loadedSprints.length - 1];
    const allNoms = nominationStorage.getNominations();
    const allEmployees = employeeStorage.getEmployees();
    setAllEmployeesList(allEmployees);
    
    const rawEmps = artManagerActions.getManagedEmployees(managerId);
    
    const empsWithScores = rawEmps.map(emp => {
        let score = 0;
        const empRecord = allEmployees.find(e => e.id === emp.id);
        const empBadges = nominationStorage.getNominationsForEmployee(emp.id);

        if (activeS) {
            const teamSize = allEmployees.filter(e => e.teamId === emp.teamId).length;
            const potentialVoters = Math.max(1, teamSize - 1); 
            const fairnessMultiplier = SCALING_FACTOR / Math.sqrt(potentialVoters);
            
            const activeStart = new Date(activeS.startDate).getTime();
            const activeEnd = new Date(activeS.endDate).getTime();

            const received = empBadges.filter(n => new Date(n.timestamp).getTime() >= activeStart && new Date(n.timestamp).getTime() <= activeEnd);
            
            score += received.length * Math.round(BASE_VOTE_VALUE * fairnessMultiplier);
        }
        return { 
            ...emp, 
            totalScore: score, 
            totalAwards: empBadges.length,
            jobTitle: empRecord?.jobTitle || 'Team Member'
        };
    });

    setManagedEmployees(empsWithScores);
  }, []);

  useEffect(() => {
    const user = auth.getCurrentUser('art-manager');
    if (!user || user.role !== 'art-manager') {
        navigate("/");
        return;
    }
    setCurrentUser(user);
    loadData(user.id);

    const handleStorageChange = () => loadData(user.id);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);
    
    const interval = setInterval(() => loadData(user.id), 2000);

    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, [navigate, loadData]);

  const handleApprove = (id: string) => {
    if (teams.length === 0) {
         toast.error("Please create a Team first so you can assign them.");
         setActiveTab('teams');
         return;
    }
    const teamToAssign = approvalTeamSelections[id] || teams[0].id;
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
      if (emp.status === 'approved') {
          adminActions.rejectUser(emp.id);
          artManagerActions.removeEmployeeFromTeam(emp.id);
          toast.success(`${emp.firstName} has been disabled.`);
      } else {
          adminActions.approveUser(emp.id);
          toast.success(`${emp.firstName} access restored. Please re-assign them to a team.`);
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
      if (!teamForm.name.trim() || !teamForm.artId) return toast.error("Team requires a Name and an assigned ART.");
      
      if (editingTeam) {
          artManagerActions.updateTeam(editingTeam.id, teamForm.artId, teamForm.name, teamForm.description);
          toast.success("Team Updated");
      } else {
          artManagerActions.createTeam(teamForm.artId, teamForm.name, teamForm.description);
          toast.success("Team Created");
      }
      setIsTeamModalOpen(false);
      loadData(currentUser.id);
  };

  const handleDeleteTeam = (id: string) => {
      artManagerActions.deleteTeam(id);
      toast.success("Team Deleted");
      loadData(currentUser.id);
  };

  const handleRemoveFromTeam = (empId: string) => {
      if(artManagerActions.removeEmployeeFromTeam(empId)) {
          toast.success("Employee removed from team");
          loadData(currentUser.id);
      } else {
          toast.error("Failed to remove employee");
      }
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

  const activeSprint = sprints.find(s => s.status === 'active');
  const filteredMembers = managedEmployees.filter(emp => 
      emp.firstName.toLowerCase().includes(employeeSearch.toLowerCase()) || 
      emp.lastName.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 relative text-slate-900 font-sans">
      
      {/* CSS Injection for Fonts and Animations */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap');
          .font-elegant { font-family: 'Playfair Display', serif; }
          
          @keyframes antigravity { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
          @keyframes antigravity-reverse { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(15px) rotate(3deg); } }
          .animate-float { animation: antigravity 6s ease-in-out infinite; }
          .animate-float-reverse { animation: antigravity-reverse 7s ease-in-out infinite; }
        `}
      </style>

      {/* SEAMLESS FIXED BACKGROUND */}
      <div className="absolute top-0 left-0 w-full h-[350px] bg-slate-100 z-0 border-b border-slate-200" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-6 w-full md:w-auto">
                <div 
                    className="relative group cursor-pointer shrink-0" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Profile Picture"
                >
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-2xl font-bold text-[#0A1128] border border-slate-200 overflow-hidden shadow-sm transition-all group-hover:border-[#0A1128]">
                        {currentUser?.profilePicture ? (
                            <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            currentUser?.firstName?.charAt(0) || 'M'
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#0A1128] p-1.5 rounded-full shadow-md text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-3.5 h-3.5" />
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <div className="flex-1">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Manager Console</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Welcome back, <span className="text-slate-700 font-bold">{currentUser?.firstName}</span>. Organize your Release Trains and coordinate sprint phases.
                    </p>
                </div>
            </div>
            
            <div className="mt-8 md:mt-0 flex gap-3 shrink-0">
                <Button variant="outline" onClick={() => { loadData(currentUser.id); toast.info("System refreshed"); }} className="bg-white text-slate-600 hover:bg-slate-50 border-slate-200 h-11 px-5 rounded-xl font-semibold">
                    <RefreshCw className="w-4 h-4 mr-2" /> Sync
                </Button>
                <Button variant="secondary" onClick={() => { auth.logout(); navigate("/"); }} className="bg-white border border-slate-200 text-[#0A1128] hover:bg-slate-50 shadow-sm h-11 px-6 font-bold rounded-xl">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
            </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex overflow-x-auto custom-scrollbar gap-2 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 max-w-fit mx-auto lg:mx-0">
            <Button variant={activeTab === 'overview' ? 'default' : 'ghost'} onClick={() => setActiveTab('overview')} className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === 'overview' ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}>
                <LayoutDashboard className="w-4 h-4 mr-2" /> Overview
            </Button>
            <Button variant={activeTab === 'requests' ? 'default' : 'ghost'} onClick={() => setActiveTab('requests')} className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === 'requests' ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}>
                <Clock className="w-4 h-4 mr-2" /> Requests
                {pendingEmployees.length > 0 && <Badge className={`ml-2 px-1.5 py-0 h-5 border-0 ${activeTab === 'requests' ? 'bg-white text-[#0A1128]' : 'bg-[#0A1128]/10 text-[#0A1128]'}`}>{pendingEmployees.length}</Badge>}
            </Button>
            <Button variant={activeTab === 'arts' ? 'default' : 'ghost'} onClick={() => setActiveTab('arts')} className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === 'arts' ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}>
                <Map className="w-4 h-4 mr-2" /> Manage ARTs
            </Button>
            <Button variant={activeTab === 'teams' ? 'default' : 'ghost'} onClick={() => setActiveTab('teams')} className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === 'teams' ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}>
                <Network className="w-4 h-4 mr-2" /> Manage Teams
            </Button>
            <Button variant={activeTab === 'members' ? 'default' : 'ghost'} onClick={() => setActiveTab('members')} className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === 'members' ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}>
                <Users className="w-4 h-4 mr-2" /> Team Members
            </Button>
            <Button variant={activeTab === 'sprints' ? 'default' : 'ghost'} onClick={() => setActiveTab('sprints')} className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === 'sprints' ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}>
                <Calendar className="w-4 h-4 mr-2" /> Manage Sprints
            </Button>
        </div>

        {/* CONTENT AREA */}
        <div className="mt-4">
            
            {/* VIEW: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* ENFORCEMENT BANNER */}
                    {arts.length === 0 && (
                        <Card className="border border-amber-200 shadow-sm rounded-[2rem] bg-amber-50 cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setActiveTab('arts')}>
                            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                                        <Map className="w-6 h-6 text-amber-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-900">Setup Required</h3>
                                        <p className="text-slate-600 text-sm mt-1 font-medium">
                                            You must create an Agile Release Train (ART) before you can approve employees or build teams.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-amber-700 flex items-center">
                                    Create Your ART <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* ACTION REQUIRED PROMPT */}
                    {pendingEmployees.length > 0 && arts.length > 0 && (
                        <Card className="border border-[#0A1128]/20 shadow-sm rounded-[2rem] bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('requests')}>
                            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#0A1128]/5 rounded-xl shrink-0">
                                        <Zap className="w-6 h-6 text-[#0A1128]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-900">Action Required</h3>
                                        <p className="text-slate-500 text-sm mt-1 font-medium">
                                            You have <strong>{pendingEmployees.length}</strong> employee access request(s) waiting for approval.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-[#0A1128] flex items-center">
                                    Review Requests <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* NEAT STATS GRID (Matches Admin Dashboard perfectly - Reordered per request) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        <Card className="border border-slate-200 shadow-sm rounded-[1.5rem] bg-white hover:border-[#0A1128]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group" onClick={() => setActiveTab('requests')}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Clock className="w-32 h-32 text-slate-900 animate-float-reverse" />
                            </div>
                            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#0A1128] transition-colors">Pending Requests</p>
                                        <h3 className="text-4xl font-extrabold text-slate-900">{pendingEmployees.length}</h3>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-[#0A1128]/5 group-hover:text-[#0A1128] transition-all border border-slate-100/50">
                                        <Clock className="w-7 h-7" />
                                    </div>
                                </div>
                                <div className="mt-auto flex items-center text-xs font-semibold text-slate-400">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Requires attention
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-200 shadow-sm rounded-[1.5rem] bg-white hover:border-[#0A1128]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group" onClick={() => setActiveTab('teams')}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Network className="w-32 h-32 text-slate-900 animate-float" />
                            </div>
                            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#0A1128] transition-colors">Managed Teams</p>
                                        <h3 className="text-4xl font-extrabold text-slate-900">14</h3>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0A1128]/5 group-hover:text-[#0A1128] transition-all border border-slate-100/50">
                                        <Network className="w-7 h-7" />
                                    </div>
                                </div>
                                <div className="mt-auto flex items-center text-xs font-semibold text-slate-400">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Synced from backend
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-200 shadow-sm rounded-[1.5rem] bg-white hover:border-[#0A1128]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group" onClick={() => setActiveTab('sprints')}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Calendar className="w-32 h-32 text-slate-900 animate-float-reverse" />
                            </div>
                            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#0A1128] transition-colors">Sprint Phases</p>
                                        <h3 className="text-4xl font-extrabold text-slate-900">8</h3>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0A1128]/5 group-hover:text-[#0A1128] transition-all border border-slate-100/50">
                                        <Calendar className="w-7 h-7" />
                                    </div>
                                </div>
                                <div className="mt-auto flex items-center text-xs font-semibold text-slate-400">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Synced from backend
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-200 shadow-sm rounded-[1.5rem] bg-white hover:border-[#0A1128]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group" onClick={() => setActiveTab('members')}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Users className="w-32 h-32 text-slate-900 animate-float" />
                            </div>
                            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#0A1128] transition-colors">Total Employees</p>
                                        <h3 className="text-4xl font-extrabold text-slate-900">256</h3>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0A1128]/5 group-hover:text-[#0A1128] transition-all border border-slate-100/50">
                                        <Users className="w-7 h-7" />
                                    </div>
                                </div>
                                <div className="mt-auto flex items-center text-xs font-semibold text-slate-400">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Synced from backend
                                </div>
                            </CardContent>
                        </Card>
                        
                    </div>

                    {/* NEAT TEXTUAL OVERVIEW SECTION */}
                    <div className="mt-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <LayoutDashboard className="w-6 h-6 text-[#0A1128]" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">📊 Manager Overview</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-[#0A1128]/5 text-[#0A1128]">
                                            <Users className="w-6 h-6"/>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">👥 Manager Responsibilities</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">As an ART Manager, you are the central coordinator for your Agile Release Train. Your primary focus is structuring your domain, reviewing and approving employee access requests, and organizing specific functional groups.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-[#0A1128]/5 text-[#0A1128]">
                                            <Map className="w-6 h-6"/>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">🔗 ART Coordination</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">You manage a single Agile Release Train (ART), representing your broader department. While your domain is singular, you have the flexibility to create as many specialized sub-teams as needed to accurately map your structure.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-[#0A1128]/5 text-[#0A1128]">
                                            <Calendar className="w-6 h-6"/>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">🚀 Sprint Management</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">Sprint phases define the boundaries for performance tracking. Create and toggle active sprints to frame nomination windows. Once a sprint is completed, the scores are locked into the historical leaderboard.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-[#0A1128]/5 text-[#0A1128]">
                                            <Network className="w-6 h-6"/>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">🤝 Team Collaboration</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">Effective team structures are critical to the platform's fairness algorithm. Organizing users correctly ensures that recognition points scale fairly based on team size, maintaining a perfectly balanced playing field.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: PENDING REQUESTS */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-5 h-5 text-slate-500" />
                                        <CardTitle className="text-lg font-bold text-slate-900">Pending Employee Requests</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium text-slate-500">
                                        Review and securely approve access requests from new employees joining your domain.
                                    </CardDescription>
                                </div>
                                {pendingEmployees.length > 0 && (
                                    <Badge className="bg-[#0A1128]/10 text-[#0A1128] px-4 py-1.5 text-sm rounded-lg border-0 font-bold shrink-0">
                                        {pendingEmployees.length} Pending
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingEmployees.length === 0 ? (
                                <div className="py-24 text-center bg-slate-50/30">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                                        <Check className="w-10 h-10 text-emerald-400" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-600">All caught up!</p>
                                    <p className="text-sm text-slate-500 mt-1">No pending requests right now.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {pendingEmployees.map(req => (
                                        <div key={req.id} className="p-6 px-6 sm:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 hover:bg-slate-50 transition-colors">
                                            
                                            <div className="flex items-center gap-4 min-w-[250px]">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-lg border border-slate-200">
                                                    {req.firstName.charAt(0)}{req.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-lg">{req.firstName} {req.lastName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="font-bold px-2 py-0.5 border-0 shadow-sm bg-slate-50 text-slate-600">
                                                            Employee
                                                        </Badge>
                                                        <span className="text-xs text-slate-500">
                                                            Requested: {new Date(req.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full xl:max-w-md flex flex-col space-y-1.5">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Assign to Team</span>
                                                {teams.length === 0 ? (
                                                    <div className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl border border-red-100 font-medium">
                                                        Create a Team first in the 'Manage Teams' tab.
                                                    </div>
                                                ) : (
                                                    <select 
                                                        className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-700 focus:border-[#0A1128] transition-all outline-none cursor-pointer"
                                                        value={approvalTeamSelections[req.id] || teams[0].id}
                                                        onChange={e => setApprovalTeamSelections({...approvalTeamSelections, [req.id]: e.target.value})}
                                                    >
                                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({arts.find(a => a.id === t.artId)?.name})</option>)}
                                                    </select>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 w-full xl:w-auto justify-end pt-4 xl:pt-0">
                                                <Button variant="outline" className="h-10 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200 px-5 font-bold rounded-lg" onClick={() => handleReject(req.id)}>
                                                    Deny
                                                </Button>
                                                <Button className="h-10 bg-[#0A1128] hover:bg-[#141E3C] text-white px-6 font-bold rounded-lg" onClick={() => handleApprove(req.id)} disabled={teams.length === 0}>
                                                    Approve
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: MANAGE ARTS */}
            {activeTab === 'arts' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="mb-2 sm:mb-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Map className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Manage ARTs</CardTitle>
                                </div>
                                <CardDescription className="text-sm font-medium text-slate-500">
                                    Configure and oversee your primary Agile Release Train and its associated department.
                                </CardDescription>
                            </div>
                            {/* ONLY SHOW CREATE BUTTON IF NO ART EXISTS YET */}
                            {arts.length === 0 && (
                                <Button 
                                    className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-10 px-6 font-bold rounded-lg shadow-sm shrink-0"
                                    onClick={() => { setEditingArt(null); setArtForm({name:'', department:''}); setIsArtModalOpen(true); }}
                                >
                                    <Plus className="w-4 h-4 mr-2"/> Create ART
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-3 px-6 border-b border-slate-200">
                                <div className="col-span-5">ART Name</div>
                                <div className="col-span-4">Department</div>
                                <div className="col-span-3 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {arts.map(art => (
                                    <div key={art.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-5 font-semibold text-slate-900 pr-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm">
                                                <Map className="w-5 h-5" />
                                            </div>
                                            <span className="truncate text-base">{art.name}</span>
                                        </div>
                                        <div className="col-span-4 text-sm text-slate-500 pr-6 font-medium">
                                            {art.department}
                                        </div>
                                        <div className="col-span-3 text-right flex justify-end gap-2">
                                            <Button size="sm" className="h-9 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-100 font-bold rounded-lg shadow-sm" onClick={() => { setEditingArt(art); setArtForm({ name: art.name, department: art.department }); setIsArtModalOpen(true); }}>
                                                <Edit className="w-4 h-4 mr-1.5" /> Edit
                                            </Button>
                                            <Button size="sm" className="h-9 px-4 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-100 font-bold rounded-lg shadow-sm" onClick={() => handleDeleteART(art.id)}>
                                                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {arts.length === 0 && (
                                    <div className="text-center py-20 text-slate-400">
                                        <Map className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                        <p className="text-lg text-slate-600 font-bold">No ARTs found.</p>
                                        <p className="text-sm font-medium mt-1">Create an ART to get started.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: MANAGE TEAMS */}
            {activeTab === 'teams' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="mb-2 sm:mb-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Network className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Manage Teams</CardTitle>
                                </div>
                                <CardDescription className="text-sm font-medium text-slate-500">
                                    Create and organize dynamic sub-teams within your assigned Agile Release Train.
                                </CardDescription>
                            </div>
                            <Button 
                                className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-10 px-6 font-bold rounded-lg shadow-sm shrink-0"
                                onClick={() => { 
                                    if(arts.length===0) return toast.error("Create an ART first!"); 
                                    setEditingTeam(null); setTeamForm({artId: arts[0].id, name:'', description:''}); setIsTeamModalOpen(true); 
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2"/> Create Team
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-3 px-6 border-b border-slate-200">
                                <div className="col-span-4">Team Name</div>
                                <div className="col-span-3">Description</div>
                                <div className="col-span-2">Parent ART</div>
                                <div className="col-span-3 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {teams.map(team => (
                                    <div key={team.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-semibold text-slate-900 pr-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm">
                                                <Network className="w-5 h-5" />
                                            </div>
                                            <span className="truncate text-base">{team.name}</span>
                                        </div>
                                        <div className="col-span-3 text-sm text-slate-500 pr-6 font-medium truncate">
                                            {team.description}
                                        </div>
                                        <div className="col-span-2">
                                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-bold px-3 py-1 shadow-sm">
                                                {arts.find(a => a.id === team.artId)?.name || "Unknown"}
                                            </Badge>
                                        </div>
                                        <div className="col-span-3 text-right flex justify-end gap-2">
                                            <Button size="sm" className="h-9 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-100 font-bold rounded-lg shadow-sm" onClick={() => { setEditingTeam(team); setTeamForm({ artId: team.artId, name: team.name, description: team.description }); setIsTeamModalOpen(true); }}>
                                                <Edit className="w-4 h-4 mr-1.5" /> Edit
                                            </Button>
                                            <Button size="sm" className="h-9 px-4 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-100 font-bold rounded-lg shadow-sm" onClick={() => handleDeleteTeam(team.id)}>
                                                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {teams.length === 0 && (
                                    <div className="text-center py-20 text-slate-400">
                                        <Network className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                        <p className="text-lg text-slate-600 font-bold">No teams found.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: MANAGE TEAM MEMBERS */}
            {activeTab === 'members' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="mb-2 md:mb-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Manage Team Members</CardTitle>
                                </div>
                                <CardDescription className="text-sm font-medium text-slate-500">
                                    Monitor individual performance metrics, accumulated points, and earned awards.
                                </CardDescription>
                            </div>
                            <div className="relative w-full md:w-72 shrink-0">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <Input 
                                    placeholder="Search members..." 
                                    className="pl-9 h-10 bg-white border-slate-200 rounded-lg text-sm focus:border-[#0A1128]"
                                    value={employeeSearch}
                                    onChange={(e) => setEmployeeSearch(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-3 px-6 border-b border-slate-200">
                                <div className="col-span-4">Member Profile</div>
                                <div className="col-span-3">Role & Team</div>
                                <div className="col-span-3">Performance</div>
                                <div className="col-span-2 text-right">System Access</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredMembers.map(emp => (
                                    <div key={emp.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-semibold text-slate-900 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden border bg-slate-100 border-slate-200 text-slate-700">
                                                {emp.profilePicture ? (
                                                    <img src={emp.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate pr-1 text-sm font-bold">{emp.firstName} {emp.lastName}</span>
                                                {emp.createdBy === 'system_dummy' && <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Test Account</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="col-span-3 text-sm flex flex-col min-w-0 pr-4">
                                            <span className="font-semibold text-slate-800 text-sm">{emp.jobTitle}</span>
                                            <span className="text-xs text-slate-500 mt-0.5 font-medium truncate"><Network className="w-3 h-3 inline mr-1 text-slate-400"/> {teams.find(t => t.id === emp.teamId)?.name || 'Unassigned'}</span>
                                        </div>

                                        <div className="col-span-3 flex gap-2">
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 text-xs font-bold px-2 py-0.5 shadow-sm"><Trophy className="w-3 h-3 mr-1"/> {emp.totalScore || 0} Pts</Badge>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 text-xs font-bold px-2 py-0.5 shadow-sm"><Award className="w-3 h-3 mr-1"/> {emp.totalAwards || 0}</Badge>
                                        </div>
                                        
                                        <div className="col-span-2 text-right flex justify-end items-center">
                                            {/* ACTIVE / DISABLE TOGGLE UI */}
                                            {emp.createdBy !== 'system_dummy' ? (
                                                <div 
                                                    className="flex items-center gap-3 cursor-pointer group"
                                                    onClick={() => toggleEmployeeStatus(emp)}
                                                >
                                                    <span className={`text-xs font-bold uppercase tracking-widest ${emp.status === 'approved' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                        {emp.status === 'approved' ? 'Active' : 'Disabled'}
                                                    </span>
                                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner border border-black/5 ${emp.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${emp.status === 'approved' ? 'translate-x-5' : 'translate-x-1'}`} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-500 font-bold border-0 px-2 py-0.5 shadow-sm">Fixed</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {filteredMembers.length === 0 && (
                                    <div className="text-center py-20 text-slate-400">
                                        <Users className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                        <p className="text-lg text-slate-600 font-bold">No members found.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: MANAGE SPRINTS */}
            {activeTab === 'sprints' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="mb-2 sm:mb-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Manage Sprints</CardTitle>
                                </div>
                                <CardDescription className="text-sm font-medium text-slate-500">
                                    Control the quarterly review phases and establish active timeframes for peer nominations.
                                </CardDescription>
                            </div>
                            <Button 
                                className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-10 px-6 font-bold rounded-lg shadow-sm shrink-0"
                                onClick={() => { setEditingSprint(null); setSprintForm({title:'', startDate:'', endDate:'', quarter:'Q1', status:'planned'}); setIsSprintModalOpen(true); }}
                            >
                                <Plus className="w-4 h-4 mr-2"/> Create Sprint
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-3 px-6 border-b border-slate-200">
                                <div className="col-span-3">Phase Title</div>
                                <div className="col-span-2">Quarter</div>
                                <div className="col-span-3">Duration</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {sprints.map(sp => (
                                    <div key={sp.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-3 font-semibold text-slate-900 pr-4 flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 ${sp.status==='active' ? 'bg-red-50 text-red-600' : sp.status==='completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <span className="truncate text-sm font-bold">{sp.title}</span>
                                        </div>
                                        <div className="col-span-2 text-sm text-slate-600 font-bold">
                                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700 text-xs px-2 py-0.5 shadow-sm">{sp.quarter}</Badge>
                                        </div>
                                        <div className="col-span-3 text-sm text-slate-600 font-medium">
                                            {new Date(sp.startDate).toLocaleDateString()} - {new Date(sp.endDate).toLocaleDateString()}
                                        </div>
                                        <div className="col-span-2">
                                            <Badge className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border-0 shadow-sm ${
                                                sp.status === 'active' ? 'bg-red-500 text-white' :
                                                sp.status === 'completed' ? 'bg-emerald-500 text-white' :
                                                'bg-blue-500 text-white'
                                            }`}>
                                                {sp.status}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2 text-right flex justify-end gap-2">
                                            <Button size="sm" className="h-8 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-100 font-bold rounded-md shadow-sm" onClick={() => { setEditingSprint(sp); setSprintForm({ title: sp.title, startDate: sp.startDate.split('T')[0], endDate: sp.endDate.split('T')[0], quarter: sp.quarter, status: sp.status }); setIsSprintModalOpen(true); }}>
                                                <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                                            </Button>
                                            <Button size="sm" className="h-8 px-3 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-100 font-bold rounded-md shadow-sm" onClick={() => handleDeleteSprint(sp.id)}>
                                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {sprints.length === 0 && (
                                    <div className="text-center py-20 text-slate-400">
                                        <Calendar className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                        <p className="text-lg text-slate-600 font-bold">No sprints defined.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

        </div>

      </div>

      {/* CRUD MODALS */}

      {/* ART MODAL */}
      {isArtModalOpen && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80">
                 <div>
                     <h2 className="text-xl font-bold text-slate-900">{editingArt ? 'Edit ART' : 'Create ART'}</h2>
                 </div>
                 <button onClick={() => setIsArtModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors">
                     <X className="w-4 h-4" />
                 </button>
             </div>
             <form onSubmit={handleSaveART} className="p-6 space-y-5">
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">ART Name</label>
                     <Input placeholder="e.g. Platform Engineering" value={artForm.name} onChange={e => setArtForm({...artForm, name: e.target.value})} required className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] font-medium" />
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Department</label>
                     <Input placeholder="e.g. Engineering" value={artForm.department} onChange={e => setArtForm({...artForm, department: e.target.value})} required className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] font-medium" />
                 </div>
                 <div className="pt-4">
                     <Button type="submit" className="w-full bg-[#0A1128] hover:bg-[#141E3C] h-12 text-md font-bold text-white rounded-xl shadow-md">
                         {editingArt ? 'Save Changes' : 'Create ART'}
                     </Button>
                 </div>
             </form>
          </div>
       </div>
      )}

      {/* TEAM MODAL */}
      {isTeamModalOpen && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80">
                 <div>
                     <h2 className="text-xl font-bold text-slate-900">{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
                 </div>
                 <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors">
                     <X className="w-4 h-4" />
                 </button>
             </div>
             <form onSubmit={handleSaveTeam} className="p-6 space-y-5">
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Assign to ART</label>
                     <select 
                         className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0A1128] focus:bg-white transition-colors outline-none font-medium"
                         value={teamForm.artId}
                         onChange={e => setTeamForm({...teamForm, artId: e.target.value})}
                         required
                     >
                         <option value="" disabled>Select ART</option>
                         {arts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                     </select>
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Team Name</label>
                     <Input placeholder="e.g. Frontend Ninjas" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} required className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] font-medium" />
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Description</label>
                     <Input placeholder="Short focus description" value={teamForm.description} onChange={e => setTeamForm({...teamForm, description: e.target.value})} className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] font-medium" />
                 </div>
                 <div className="pt-4">
                     <Button type="submit" className="w-full bg-[#0A1128] hover:bg-[#141E3C] h-12 text-md font-bold text-white rounded-xl shadow-md">
                         {editingTeam ? 'Save Changes' : 'Create Team'}
                     </Button>
                 </div>
             </form>
          </div>
       </div>
      )}

      {/* SPRINT MODAL */}
      {isSprintModalOpen && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-slate-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80">
                 <div>
                     <h2 className="text-xl font-bold text-slate-900">{editingSprint ? 'Edit Sprint' : 'Create Sprint'}</h2>
                 </div>
                 <button onClick={() => setIsSprintModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors">
                     <X className="w-4 h-4" />
                 </button>
             </div>
             <form onSubmit={handleSaveSprint} className="p-6 space-y-5">
                 
                 <div className="grid grid-cols-2 gap-4">
                     <div className="col-span-2 space-y-2">
                         <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Sprint Title</label>
                         <Input placeholder="e.g. Innovation Sprint" value={sprintForm.title} onChange={e => setSprintForm({...sprintForm, title: e.target.value})} required className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] font-medium" />
                     </div>

                     <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Quarter</label>
                         <select 
                             className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0A1128] focus:bg-white transition-colors outline-none font-medium"
                             value={sprintForm.quarter}
                             onChange={e => setSprintForm({...sprintForm, quarter: e.target.value as any})}
                             required
                         >
                             <option value="Q1">Q1</option>
                             <option value="Q2">Q2</option>
                             <option value="Q3">Q3</option>
                             <option value="Q4">Q4</option>
                         </select>
                     </div>

                     <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Status</label>
                         <select 
                             className="flex h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0A1128] focus:bg-white transition-colors outline-none font-medium"
                             value={sprintForm.status}
                             onChange={e => setSprintForm({...sprintForm, status: e.target.value as any})}
                             required
                         >
                             <option value="planned">Planned</option>
                             <option value="active">Active</option>
                             <option value="completed">Completed</option>
                         </select>
                     </div>

                     <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Start Date</label>
                         <Input type="date" value={sprintForm.startDate} onChange={e => setSprintForm({...sprintForm, startDate: e.target.value})} required className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] font-medium text-slate-700" />
                     </div>
                     <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">End Date</label>
                         <Input type="date" value={sprintForm.endDate} onChange={e => setSprintForm({...sprintForm, endDate: e.target.value})} required className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] font-medium text-slate-700" />
                     </div>
                 </div>

                 <div className="pt-4">
                     <Button type="submit" className="w-full bg-[#0A1128] hover:bg-[#141E3C] h-12 text-md font-bold text-white rounded-lg shadow-md">
                         {editingSprint ? 'Save Changes' : 'Create Sprint'}
                     </Button>
                 </div>
             </form>
          </div>
       </div>
      )}

    </div>
  );
};

export default ManagerDashboard;