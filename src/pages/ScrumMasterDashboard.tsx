import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { 
  Users, Calendar, Trash2, Check, X, Clock, LogOut, Edit, Camera, 
  Search, LayoutDashboard, ChevronRight, Zap, RefreshCw, Network, 
  Plus, Vote, Map, Trophy 
} from "lucide-react";
import { auth, artManagerActions, adminActions, sprintStorage, nominationStorage, awardStorage, StoredUser, Team, StoredSprint, STORAGE_KEYS, userActions } from "@/lib/localStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const SCALING_FACTOR = 3.0;
const BASE_VOTE_VALUE = 50;

interface ManagedUserWithScore extends StoredUser {
    totalScore?: number;
    totalAwards?: number;
    jobTitle?: string;
    name?: string; 
    badges?: any[]; 
    department?: string; 
}

type ScrumMasterTab = 'overview' | 'requests' | 'teams' | 'members' | 'sprints';

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

const ScrumMasterDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ScrumMasterTab>('overview');
  
  const [pendingEmployees, setPendingEmployees] = useState<StoredUser[]>([]);
  const [managedEmployees, setManagedEmployees] = useState<ManagedUserWithScore[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sprints, setSprints] = useState<StoredSprint[]>([]);

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [approvalTeamSelections, setApprovalTeamSelections] = useState<Record<string, string>>({});

  const [myArtName, setMyArtName] = useState<string>("Loading...");
  const [myTeamName, setMyTeamName] = useState<string>("Loading...");

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamForm, setTeamForm] = useState({ name: '', description: '' });

  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<StoredSprint | null>(null);
  const [sprintForm, setSprintForm] = useState({ title: '', startDate: '', endDate: '', quarter: 'Q1', status: 'planned' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback((userId: string) => {
    const user = auth.getCurrentUser();
    if (!user || !user.artId) return;

    setPendingEmployees(artManagerActions.getPendingEmployeesForScrumMaster(user.artId));
    
    const allArts = artManagerActions.getARTs();
    const allTeams = artManagerActions.getTeams();
    
    const myArtObj = allArts.find(a => a.id === user.artId);
    const myTeamObj = allTeams.find(t => t.id === user.teamId);
    setMyArtName(myArtObj?.name || "Unknown ART");
    setMyTeamName(myTeamObj?.name || "Unknown Team");

    const myTeams = allTeams.filter(t => t.artId === user.artId);
    setTeams(myTeams);

    const loadedSprints = myArtObj ? sprintStorage.getSprints(myArtObj.managerId) : [];
    setSprints(loadedSprints);
    
    const fetchedAwards = awardStorage.getAwards();
    const activeS = loadedSprints.find(s => s.status === 'active') || loadedSprints[loadedSprints.length - 1];
    
    const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    const rawEmps = allUsers.filter((u: any) => u.role === 'employee' && u.artId === user.artId && u.status === 'approved');
    
    const checkSprintBounds = (timestampStr: string) => {
        if (!activeS) return false;
        const d = new Date(timestampStr).getTime();
        const start = new Date(activeS.startDate).setHours(0,0,0,0);
        const end = new Date(activeS.endDate).setHours(23,59,59,999);
        return activeS.status === 'active' ? (d >= start) : (d >= start && d <= end);
    };

    const empsWithScores = rawEmps.map((emp: any) => {
        const empBadges = nominationStorage.getNominationsForEmployee(emp.id);
        const currentSprintBadges = empBadges.filter(b => checkSprintBounds(b.timestamp));
        let score = 0;

        if (activeS) {
            const teamSize = allUsers.filter((e: any) => e.teamId === emp.teamId && e.status === 'approved').length;
            const potentialVoters = Math.max(1, teamSize - 1); 
            const fairnessMultiplier = SCALING_FACTOR / Math.sqrt(potentialVoters);
            
            currentSprintBadges.forEach(b => { 
                const awardDef = fetchedAwards.find(a => a.type === b.awardType);
                const basePoints = awardDef?.points || 50;
                score += Math.round(basePoints * fairnessMultiplier); 
            });
        }
        
        return { 
            ...emp, 
            name: getDisplayName(emp), 
            badges: currentSprintBadges, 
            totalScore: score, 
            totalAwards: empBadges.length,
            jobTitle: emp.jobTitle || 'Team Member'
        };
    });

    setManagedEmployees(empsWithScores);
  }, []);

  useEffect(() => {
    const user = auth.getCurrentUser('employee');
    if (!user || user.jobTitle !== 'Scrum Master') {
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

  const handleApprove = (id: string, presetTeamId?: string) => {
    if (teams.length === 0) return toast.error("There are no teams available in this ART.");
    const teamToAssign = presetTeamId || approvalTeamSelections[id] || teams[0].id;
    if(artManagerActions.approveEmployee(id, teamToAssign)) {
        toast.success(`Employee approved and assigned!`);
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
      if (emp.jobTitle === 'Scrum Master' || emp.role !== 'employee') return toast.error("Action restricted.");
      const name = getDisplayName(emp);
      if (emp.status === 'approved') {
          adminActions.rejectUser(emp.id);
          artManagerActions.removeEmployeeFromTeam(emp.id);
          toast.success(`${name} has been disabled.`);
      } else {
          adminActions.approveUser(emp.id);
          toast.success(`${name} access restored.`);
      }
      loadData(currentUser.id);
  };

  const handleRemoveFromTeam = (emp: ManagedUserWithScore) => {
      if (emp.jobTitle === 'Scrum Master' || emp.role !== 'employee') return toast.error("Action restricted.");
      if (artManagerActions.removeEmployeeFromTeam(emp.id)) {
          toast.success(`${getDisplayName(emp)} removed from team.`);
          loadData(currentUser.id);
      }
  };

  const handleSaveTeam = (e: React.FormEvent) => {
      e.preventDefault();
      if (!teamForm.name.trim()) return toast.error("Team requires a Name.");
      if (editingTeam) artManagerActions.updateTeam(editingTeam.id, currentUser.artId, teamForm.name, teamForm.description);
      else artManagerActions.createTeam(currentUser.artId, teamForm.name, teamForm.description);
      setIsTeamModalOpen(false);
      loadData(currentUser.id);
      toast.success("Teams updated.");
  };

  const handleDeleteTeam = (id: string) => {
      if (id === currentUser.teamId) return toast.error("Cannot delete your own assigned team.");
      artManagerActions.deleteTeam(id);
      toast.success("Team Deleted");
      loadData(currentUser.id);
  };

  const handleSaveSprint = (e: React.FormEvent) => {
      e.preventDefault();
      if (!sprintForm.title.trim() || !sprintForm.startDate || !sprintForm.endDate) return toast.error("Fill all fields.");
      const mid = artManagerActions.getARTs().find(a => a.id === currentUser.artId)?.managerId || currentUser.id;
      if (editingSprint) sprintStorage.updateSprint(editingSprint.id, sprintForm.title, sprintForm.startDate, sprintForm.endDate, sprintForm.quarter, sprintForm.status, mid);
      else sprintStorage.addSprint(sprintForm.title, sprintForm.startDate, sprintForm.endDate, sprintForm.quarter, sprintForm.status, mid);
      setIsSprintModalOpen(false);
      loadData(currentUser.id);
      toast.success("Sprint logic updated.");
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

  const handleLogout = () => { auth.logout(); navigate("/"); };

  const filteredMembers = managedEmployees.filter(emp => 
      emp.id !== currentUser?.id && getDisplayName(emp).toLowerCase().includes(employeeSearch.toLowerCase())
  );

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-12 relative text-slate-900 font-sans">
      
      <style>
        {`
          @keyframes antigravity { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
          .animate-float { animation: antigravity 6s ease-in-out infinite; }
        `}
      </style>

      <div className="absolute top-0 left-0 w-full h-[350px] bg-slate-100 z-0 border-b border-slate-200" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-6 w-full md:w-auto">
                <div 
                    className="relative group cursor-pointer shrink-0 animate-float" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Profile Picture"
                >
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-3xl font-black text-[#0A1128] border-4 border-slate-100 overflow-hidden uppercase shadow-xl transition-all group-hover:border-indigo-200">
                        {currentUser?.profilePicture ? (
                            <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            getDisplayName(currentUser).charAt(0)
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#0A1128] p-2 rounded-full shadow-lg text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-4 h-4" />
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <div className="flex-1">
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-1">Scrum Master Console</h2>
                    <p className="text-slate-500 text-sm font-medium">Domain: <span className="text-indigo-600 font-bold">{myArtName}</span> • Team: <span className="text-indigo-600 font-bold">{myTeamName}</span></p>
                </div>
            </div>
            
            <div className="mt-8 md:mt-0 flex gap-3 shrink-0">
                <Button variant="outline" onClick={() => { loadData(currentUser.id); toast.info("System refreshed"); }} className="bg-white text-slate-600 h-11 px-5 rounded-xl font-bold">
                    <RefreshCw className="w-4 h-4 mr-2" /> Sync
                </Button>
                <Button variant="secondary" onClick={handleLogout} className="bg-white border border-slate-200 text-[#0A1128] shadow-sm h-11 px-6 font-bold rounded-xl">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
            </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex overflow-x-auto custom-scrollbar gap-2 bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 max-w-fit mx-auto lg:mx-0">
            {['overview', 'requests', 'teams', 'members', 'sprints'].map((t) => (
                <Button 
                  key={t}
                  variant={activeTab === t ? 'default' : 'ghost'} 
                  onClick={() => setActiveTab(t as any)} 
                  className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === t ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}
                >
                    <span className="capitalize">{t}</span>
                    {t === 'requests' && pendingEmployees.length > 0 && <Badge className="ml-2 bg-red-500 text-white border-0">{pendingEmployees.length}</Badge>}
                </Button>
            ))}
            <Button variant="ghost" onClick={() => navigate('/home')} className="rounded-xl px-5 h-10 font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600">
                <Vote className="w-4 h-4 mr-2" /> Nominate & Dashboard
            </Button>
        </div>

        {/* CONTENT AREA */}
        <div className="mt-4">
            
            {/* VIEW: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* DOMAIN & TEAM BANNER */}
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2rem] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-start gap-8 shadow-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white shadow-sm text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                                <Map className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-0.5">My Domain</p>
                                <h3 className="text-2xl font-extrabold text-indigo-950">{myArtName}</h3>
                            </div>
                        </div>
                        <div className="hidden sm:block h-12 w-px bg-indigo-200" />
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white shadow-sm text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                                <Network className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-0.5">My Team</p>
                                <h3 className="text-2xl font-extrabold text-indigo-950">{myTeamName}</h3>
                            </div>
                        </div>
                    </div>

                    {pendingEmployees.length > 0 && (
                        <Card className="border border-[#0A1128]/20 shadow-sm rounded-[2rem] bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('requests')}>
                            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#0A1128]/5 rounded-xl shrink-0">
                                        <Zap className="w-6 h-6 text-[#0A1128]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-900">Action Required</h3>
                                        <p className="text-slate-500 text-sm mt-1 font-medium">
                                            You have <strong>{pendingEmployees.length}</strong> request(s) waiting for approval in your ART.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-[#0A1128] flex items-center">
                                    Review Requests <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* TOP STATS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-300 cursor-pointer" onClick={() => setActiveTab('requests')}>
                            <div className="flex items-start justify-between mb-4">
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requests</p><h3 className="text-4xl font-black text-slate-900">{pendingEmployees.length}</h3></div>
                                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm"><Clock className="w-6 h-6"/></div>
                            </div>
                        </Card>
                        <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-300 cursor-pointer" onClick={() => setActiveTab('teams')}>
                            <div className="flex items-start justify-between mb-4">
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teams</p><h3 className="text-4xl font-black text-slate-900">{teams.length}</h3></div>
                                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm"><Network className="w-6 h-6"/></div>
                            </div>
                        </Card>
                        <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-300 cursor-pointer" onClick={() => setActiveTab('members')}>
                            <div className="flex items-start justify-between mb-4">
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Members</p><h3 className="text-4xl font-black text-slate-900">{managedEmployees.length}</h3></div>
                                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500 shadow-sm"><Users className="w-6 h-6"/></div>
                            </div>
                        </Card>
                        <Card className="p-6 rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:border-indigo-300 cursor-pointer" onClick={() => setActiveTab('sprints')}>
                            <div className="flex items-start justify-between mb-4">
                                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sprints</p><h3 className="text-4xl font-black text-slate-900">{sprints.length}</h3></div>
                                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-500 shadow-sm"><Calendar className="w-6 h-6"/></div>
                            </div>
                        </Card>
                    </div>

                    {/* REPLACED PULSE WITH 4 INFO CARDS */}
                    <div className="mt-8">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <LayoutDashboard className="w-6 h-6 text-[#0A1128]" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">📊 Scrum Master Guidelines</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Users className="w-6 h-6"/></div>
                                        <h4 className="text-lg font-bold text-slate-900">1. Team Orchestration</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">As a Scrum Master, you review and approve access requests for employees, seamlessly integrating them into your Agile Release Train and specific sub-teams.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-green-50 text-green-600"><Calendar className="w-6 h-6"/></div>
                                        <h4 className="text-lg font-bold text-slate-900">2. Phase Management</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">You have full control over Sprint boundaries. Configure start and end dates to lock in performance metrics and ensure nominations are cast within proper timeframes.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-purple-50 text-purple-600"><Vote className="w-6 h-6"/></div>
                                        <h4 className="text-lg font-bold text-slate-900">3. Active Participation</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">Unlike Train Managers, Scrum Masters operate in the trenches. Use the "Nominate & Dashboard" tab to jump into the employee view and cast votes for your peers.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-amber-50 text-amber-600"><Trophy className="w-6 h-6"/></div>
                                        <h4 className="text-lg font-bold text-slate-900">4. Performance Tracking</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">Monitor your team's engagement and point accumulations. Use the Teams and Members tabs to ensure everyone is active, properly assigned, and recognized.</p>
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
                                        <CardTitle className="text-lg font-bold text-slate-900">ART Requests</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium text-slate-500">
                                        Review and approve employees requesting to join teams within your ART.
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
                                    <p className="text-sm text-slate-500 mt-1">No pending requests for your ART right now.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {pendingEmployees.map((req, index) => {
                                        const displayName = getDisplayName(req);
                                        const requestedTeam = teams.find(t => t.id === req.teamId);

                                        return (
                                        <div key={`${req.id}-${index}`} className="p-6 px-6 sm:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 hover:bg-slate-50 transition-colors">
                                            
                                            <div className="flex items-center gap-4 min-w-[250px]">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-lg border border-slate-200 uppercase">
                                                    {displayName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-lg">{displayName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="font-bold px-2 py-0.5 border-0 shadow-sm bg-slate-50 text-slate-600">
                                                            {req.jobTitle || 'Employee'}
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
                                                        No Teams available in this ART.
                                                    </div>
                                                ) : (
                                                    <select 
                                                        className="h-11 bg-white border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-700 focus:border-[#0A1128] transition-all outline-none cursor-pointer"
                                                        value={approvalTeamSelections[req.id] || requestedTeam?.id || teams[0].id}
                                                        onChange={e => setApprovalTeamSelections({...approvalTeamSelections, [req.id]: e.target.value})}
                                                    >
                                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 w-full xl:w-auto justify-end pt-4 xl:pt-0">
                                                <Button variant="outline" className="h-10 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200 px-5 font-bold rounded-lg" onClick={() => handleReject(req.id)}>
                                                    Deny
                                                </Button>
                                                <Button className="h-10 bg-[#0A1128] hover:bg-[#141E3C] text-white px-6 font-bold rounded-lg" onClick={() => handleApprove(req.id, requestedTeam?.id)}>
                                                    Approve
                                                </Button>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: MANAGE TEAMS (Full CRUD for Scrum Master) */}
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
                                    Manage team structures within your assigned Agile Release Train.
                                </CardDescription>
                            </div>
                            <Button 
                                className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-10 px-6 font-bold rounded-lg shadow-sm shrink-0"
                                onClick={() => { 
                                    setEditingTeam(null); 
                                    setTeamForm({name:'', description:''}); 
                                    setIsTeamModalOpen(true); 
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2"/> Create Team
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-3 px-6 border-b border-slate-200">
                                <div className="col-span-4">Team Name</div>
                                <div className="col-span-5">Description</div>
                                <div className="col-span-3 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {teams.map((team, index) => (
                                    <div key={`${team.id}-${index}`} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-semibold text-slate-900 pr-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm">
                                                <Network className="w-5 h-5" />
                                            </div>
                                            <span className="truncate text-base">{team.name}</span>
                                        </div>
                                        <div className="col-span-5 text-sm text-slate-500 pr-6 font-medium truncate">
                                            {team.description}
                                        </div>
                                        <div className="col-span-3 text-right flex justify-end gap-2">
                                            <Button size="sm" className="h-9 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-100 font-bold rounded-lg shadow-sm" onClick={() => { setEditingTeam(team); setTeamForm({ name: team.name, description: team.description }); setIsTeamModalOpen(true); }}>
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
                                    <CardTitle className="text-lg font-bold text-slate-900">ART Members</CardTitle>
                                </div>
                                <CardDescription className="text-sm font-medium text-slate-500">
                                    Monitor performance metrics and system access for all employees in the ART.
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
                                <div className="col-span-2">Performance</div>
                                <div className="col-span-3 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredMembers.map((emp, index) => {
                                    return (
                                    <div key={`${emp.id}-${index}`} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-semibold text-slate-900 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden border bg-slate-100 border-slate-200 text-slate-700 shadow-sm uppercase">
                                                {emp.profilePicture ? (
                                                    <img src={emp.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{emp.name?.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate pr-1 text-sm font-bold">{emp.name}</span>
                                                {emp.createdBy === 'system_dummy' && <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Test Account</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="col-span-3 text-sm flex flex-col min-w-0 pr-4">
                                            <span className="font-semibold text-slate-800 text-sm">{emp.jobTitle}</span>
                                            <span className="text-xs text-slate-500 mt-0.5 font-medium truncate"><Network className="w-3 h-3 inline mr-1 text-slate-400"/> {teams.find(t => t.id === emp.teamId)?.name || 'Unassigned'}</span>
                                        </div>

                                        <div className="col-span-2 flex flex-col gap-1">
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 text-xs font-bold px-2 py-0.5 shadow-sm max-w-max"><Trophy className="w-3 h-3 mr-1"/> {emp.totalScore || 0} Pts</Badge>
                                        </div>
                                        
                                        <div className="col-span-3 text-right flex justify-end items-center gap-3">
                                            {emp.createdBy !== 'system_dummy' ? (
                                                <>
                                                    <div 
                                                        className="flex items-center gap-2 cursor-pointer group bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors"
                                                        onClick={() => toggleEmployeeStatus(emp)}
                                                        title="Toggle Active/Disabled Status"
                                                    >
                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${emp.status === 'approved' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                            {emp.status === 'approved' ? 'Active' : 'Disabled'}
                                                        </span>
                                                        <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-300 focus:outline-none shadow-inner border border-black/5 ${emp.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${emp.status === 'approved' ? 'translate-x-3' : 'translate-x-0.5'}`} />
                                                        </div>
                                                    </div>
                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                        onClick={() => handleRemoveFromTeam(emp)}
                                                        title="Remove from Team"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-500 font-bold border-0 px-2 py-0.5 shadow-sm">Fixed</Badge>
                                            )}
                                        </div>
                                    </div>
                                )})}
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

            {/* VIEW: MANAGE SPRINTS (Full CRUD for Scrum Master) */}
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
                                    Control the quarterly review phases for your ART.
                                </CardDescription>
                            </div>
                            <Button 
                                className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-10 px-6 font-bold rounded-lg shadow-sm shrink-0"
                                onClick={() => { 
                                    setEditingSprint(null); 
                                    setSprintForm({title:'', startDate:'', endDate:'', quarter:'Q1', status:'planned'}); 
                                    setIsSprintModalOpen(true); 
                                }}
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
                                {sprints.map((sp, index) => (
                                    <div key={`${sp.id}-${index}`} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
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
                                            <Button size="sm" className="h-8 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-100 font-bold rounded-md shadow-sm" onClick={() => { setEditingSprint(sp); setSprintForm({ title: sp.title, startDate: sp.startDate.split('T')[0], endDate: sp.endDate.split('T')[0], quarter: sp.quarter as any, status: sp.status as any }); setIsSprintModalOpen(true); }}>
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

      {/* CRUD MODALS FOR SCRUM MASTER */}
      
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
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Sprint Title</label>
                     <Input placeholder="e.g. Innovation Sprint" value={sprintForm.title} onChange={e => setSprintForm({...sprintForm, title: e.target.value})} required className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] font-medium" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
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
                     <Button type="submit" className="w-full bg-[#0A1128] hover:bg-[#141E3C] h-12 text-md font-bold text-white rounded-xl shadow-md">
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

export default ScrumMasterDashboard;