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

  // Search State
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Approvals
  const [approvalTeamSelections, setApprovalTeamSelections] = useState<Record<string, string>>({});

  // Modals & Forms for CRUD
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

  // ---- APPROVAL LOGIC ----
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

  // ---- TOGGLE ACTIVE/DISABLE STATUS ----
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

  // ---- CRUD: ARTs ----
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

  // ---- CRUD: TEAMS ----
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

  // ---- CRUD: SPRINTS ----
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
      
      {/* SIMPLE BACKGROUND */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-slate-100 z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 space-y-8">
        
        {/* HEADER SECTION - Solid Navy Blue */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#0A1128] p-8 rounded-3xl shadow-xl shadow-slate-200">
            <div className="flex items-center gap-6">
                <div 
                    className="relative group cursor-pointer shrink-0" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Profile Picture"
                >
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-white border-2 border-white/20 overflow-hidden shadow-sm transition-all group-hover:border-white/50">
                        {currentUser?.profilePicture ? (
                            <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            currentUser?.firstName?.charAt(0) || 'M'
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md text-[#0A1128] opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-3.5 h-3.5" />
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Manager Console</h2>
                    <p className="text-slate-300 text-sm mt-1">
                        Organize your Release Trains, assign teams, and control quarterly sprint phases.
                    </p>
                </div>
            </div>
            
            <div className="mt-8 md:mt-0 flex gap-3 shrink-0">
                <Button variant="outline" onClick={() => { loadData(currentUser.id); toast.info("System refreshed"); }} className="bg-white/10 text-white hover:bg-white/20 border-white/20 h-10 px-4 rounded-xl transition-colors">
                    <RefreshCw className="w-4 h-4 mr-2" /> Sync
                </Button>
                <Button variant="secondary" onClick={() => { auth.logout(); navigate("/"); }} className="bg-white text-[#0A1128] hover:bg-slate-100 shadow-sm h-10 px-6 font-bold rounded-xl transition-colors">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
            </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-xl shadow-sm border border-slate-200 max-w-fit">
            <Button 
                variant={activeTab === 'overview' ? 'default' : 'ghost'} 
                className={`rounded-lg px-4 h-9 font-semibold transition-all ${activeTab === 'overview' ? 'bg-[#0A1128] text-white hover:bg-[#141E3C]' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}
                onClick={() => setActiveTab('overview')}
            >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Overview
            </Button>
            <Button 
                variant={activeTab === 'requests' ? 'default' : 'ghost'} 
                className={`rounded-lg px-4 h-9 font-semibold transition-all ${activeTab === 'requests' ? 'bg-[#0A1128] text-white hover:bg-[#141E3C]' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}
                onClick={() => setActiveTab('requests')}
            >
                <Clock className="w-4 h-4 mr-2" /> Requests
                {pendingEmployees.length > 0 && (
                    <Badge className={`ml-2 px-1.5 py-0 h-5 border-0 ${activeTab === 'requests' ? 'bg-white text-[#0A1128]' : 'bg-[#0A1128]/10 text-[#0A1128]'}`}>
                        {pendingEmployees.length}
                    </Badge>
                )}
            </Button>
            <Button 
                variant={activeTab === 'arts' ? 'default' : 'ghost'} 
                className={`rounded-lg px-4 h-9 font-semibold transition-all ${activeTab === 'arts' ? 'bg-[#0A1128] text-white hover:bg-[#141E3C]' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}
                onClick={() => setActiveTab('arts')}
            >
                <Map className="w-4 h-4 mr-2" /> Manage ARTs
            </Button>
            <Button 
                variant={activeTab === 'teams' ? 'default' : 'ghost'} 
                className={`rounded-lg px-4 h-9 font-semibold transition-all ${activeTab === 'teams' ? 'bg-[#0A1128] text-white hover:bg-[#141E3C]' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}
                onClick={() => setActiveTab('teams')}
            >
                <Network className="w-4 h-4 mr-2" /> Manage Teams
            </Button>
            <Button 
                variant={activeTab === 'members' ? 'default' : 'ghost'} 
                className={`rounded-lg px-4 h-9 font-semibold transition-all ${activeTab === 'members' ? 'bg-[#0A1128] text-white hover:bg-[#141E3C]' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}
                onClick={() => setActiveTab('members')}
            >
                <Users className="w-4 h-4 mr-2" /> Team Members
            </Button>
            <Button 
                variant={activeTab === 'sprints' ? 'default' : 'ghost'} 
                className={`rounded-lg px-4 h-9 font-semibold transition-all ${activeTab === 'sprints' ? 'bg-[#0A1128] text-white hover:bg-[#141E3C]' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}
                onClick={() => setActiveTab('sprints')}
            >
                <Calendar className="w-4 h-4 mr-2" /> Manage Sprints
            </Button>
        </div>

        {/* CONTENT AREA */}
        <div className="mt-4">
            
            {/* VIEW: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    
                    {/* ENFORCEMENT BANNER */}
                    {arts.length === 0 && (
                        <Card className="border border-amber-200 shadow-sm rounded-2xl bg-amber-50 cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setActiveTab('arts')}>
                            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-amber-100 rounded-xl shrink-0">
                                        <Map className="w-6 h-6 text-amber-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-900">Setup Required</h3>
                                        <p className="text-slate-600 text-sm mt-1">
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
                        <Card className="border border-[#0A1128]/10 shadow-sm rounded-2xl bg-white cursor-pointer hover:border-[#0A1128]/30 transition-colors" onClick={() => setActiveTab('requests')}>
                            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#0A1128]/5 rounded-xl shrink-0">
                                        <Zap className="w-6 h-6 text-[#0A1128]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-900">Action Required</h3>
                                        <p className="text-slate-500 text-sm mt-1">
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

                    {/* MAIN STATS GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('requests')}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900">{pendingEmployees.length}</h3>
                                <p className="text-sm font-semibold text-slate-500 mt-1">Pending Requests</p>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('members')}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Users className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900">{managedEmployees.length}</h3>
                                <p className="text-sm font-semibold text-slate-500 mt-1">Total Employees</p>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('teams')}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900">{teams.length}</h3>
                                <p className="text-sm font-semibold text-slate-500 mt-1">Managed Teams</p>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('sprints')}>
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900">{sprints.length}</h3>
                                <p className="text-sm font-semibold text-slate-500 mt-1">Sprint Phases</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* VIEW: PENDING REQUESTS */}
            {activeTab === 'requests' && (
                <div>
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Pending Employee Requests</CardTitle>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingEmployees.length === 0 ? (
                                <div className="py-16 text-center">
                                    <p className="text-sm text-slate-500 italic">No pending employee requests.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {pendingEmployees.map(req => (
                                        <div key={req.id} className="p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 hover:bg-slate-50 transition-colors">
                                            
                                            <div className="flex items-center gap-4 min-w-[250px]">
                                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 font-bold border border-amber-100">
                                                    {req.firstName.charAt(0)}{req.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{req.firstName} {req.lastName}</p>
                                                    <p className="text-xs text-slate-500">Requested: {new Date(req.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full xl:max-w-md">
                                                {teams.length === 0 ? (
                                                    <div className="text-sm text-red-500 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
                                                        Create a Team first in the 'Manage Teams' tab.
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs font-bold text-slate-500 uppercase">Assign to Team:</span>
                                                        <select 
                                                            className="flex-1 h-9 bg-white border border-slate-200 rounded-md px-3 text-sm focus:border-[#0A1128] outline-none"
                                                            value={approvalTeamSelections[req.id] || teams[0].id}
                                                            onChange={e => setApprovalTeamSelections({...approvalTeamSelections, [req.id]: e.target.value})}
                                                        >
                                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({arts.find(a => a.id === t.artId)?.name})</option>)}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 w-full xl:w-auto justify-end">
                                                <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500 hover:bg-red-50" onClick={() => handleReject(req.id)}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" className="h-9 w-9 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(req.id)} disabled={teams.length === 0}>
                                                    <Check className="w-4 h-4" />
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
                <div>
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Map className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Manage ARTs</CardTitle>
                                </div>
                                <Button 
                                    className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-9 px-4 font-semibold rounded-lg w-full sm:w-auto"
                                    onClick={() => { setEditingArt(null); setArtForm({name:'', department:''}); setIsArtModalOpen(true); }}
                                >
                                    <Plus className="w-4 h-4 mr-2"/> Create ART
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white py-3 px-6 border-b border-slate-100">
                                <div className="col-span-5">ART Name</div>
                                <div className="col-span-5">Department</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {arts.map(art => (
                                    <div key={art.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-5 font-semibold text-slate-900 pr-4">
                                            {art.name}
                                        </div>
                                        <div className="col-span-5 text-sm text-slate-500 pr-6">
                                            {art.department}
                                        </div>
                                        <div className="col-span-2 text-right flex justify-end gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-md" onClick={() => { setEditingArt(art); setArtForm({ name: art.name, department: art.department }); setIsArtModalOpen(true); }}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-md" onClick={() => handleDeleteART(art.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {arts.length === 0 && (
                                    <div className="text-center py-16 text-slate-500 text-sm">
                                        No ARTs found. Create an ART to get started.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: MANAGE TEAMS */}
            {activeTab === 'teams' && (
                <div>
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Network className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Manage Teams</CardTitle>
                                </div>
                                <Button 
                                    className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-9 px-4 font-semibold rounded-lg w-full sm:w-auto"
                                    onClick={() => { 
                                        if(arts.length===0) return toast.error("Create an ART first!"); 
                                        setEditingTeam(null); setTeamForm({artId: arts[0].id, name:'', description:''}); setIsTeamModalOpen(true); 
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2"/> Create Team
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white py-3 px-6 border-b border-slate-100">
                                <div className="col-span-4">Team Name</div>
                                <div className="col-span-4">Description</div>
                                <div className="col-span-2">Parent ART</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {teams.map(team => (
                                    <div key={team.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-semibold text-slate-900 pr-4">
                                            {team.name}
                                        </div>
                                        <div className="col-span-4 text-sm text-slate-500 pr-6 truncate">
                                            {team.description}
                                        </div>
                                        <div className="col-span-2">
                                            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
                                                {arts.find(a => a.id === team.artId)?.name || "Unknown"}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2 text-right flex justify-end gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-md" onClick={() => { setEditingTeam(team); setTeamForm({ artId: team.artId, name: team.name, description: team.description }); setIsTeamModalOpen(true); }}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-md" onClick={() => handleDeleteTeam(team.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {teams.length === 0 && (
                                    <div className="text-center py-16 text-slate-500 text-sm">
                                        No teams found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: MANAGE TEAM MEMBERS */}
            {activeTab === 'members' && (
                <div>
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Manage Team Members</CardTitle>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <Input 
                                        placeholder="Search members..." 
                                        className="pl-9 h-9 bg-white border-slate-200 rounded-lg text-sm focus:border-[#0A1128]"
                                        value={employeeSearch}
                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-wider bg-white py-3 px-6 border-b border-slate-100">
                                <div className="col-span-4">Member Profile</div>
                                <div className="col-span-3">Role & Team</div>
                                <div className="col-span-3">Performance</div>
                                <div className="col-span-2 text-right">System Access</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredMembers.map(emp => (
                                    <div key={emp.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-semibold text-slate-900 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0 overflow-hidden border bg-slate-50 border-slate-200 text-slate-700">
                                                {emp.profilePicture ? (
                                                    <img src={emp.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</span>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="truncate pr-1 text-sm">{emp.firstName} {emp.lastName}</span>
                                                {emp.createdBy === 'system_dummy' && <span className="text-[10px] text-slate-400">Test Account</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="col-span-3 text-sm flex flex-col min-w-0 pr-4">
                                            <span className="font-semibold text-slate-800">{emp.jobTitle}</span>
                                            <span className="text-xs text-slate-500 mt-0.5">{teams.find(t => t.id === emp.teamId)?.name || 'Unassigned'}</span>
                                        </div>

                                        <div className="col-span-3 flex gap-2">
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-0 text-[10px]">{emp.totalScore || 0} Pts</Badge>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-0 text-[10px]">{emp.totalAwards || 0} Awards</Badge>
                                        </div>
                                        
                                        <div className="col-span-2 text-right flex justify-end items-center">
                                            {emp.createdBy !== 'system_dummy' ? (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className={`h-8 px-3 text-xs ${emp.status === 'approved' ? 'text-red-600 hover:bg-red-50 border-red-200' : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'}`}
                                                    onClick={() => toggleEmployeeStatus(emp)}
                                                >
                                                    {emp.status === 'approved' ? 'Disable' : 'Enable'}
                                                </Button>
                                            ) : (
                                                <Badge className="bg-slate-100 text-slate-400 font-normal">Fixed</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {filteredMembers.length === 0 && (
                                    <div className="text-center py-16 text-slate-500 text-sm">
                                        No members found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: MANAGE SPRINTS */}
            {activeTab === 'sprints' && (
                <div>
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-5 px-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-slate-500" />
                                    <CardTitle className="text-lg font-bold text-slate-900">Manage Sprints</CardTitle>
                                </div>
                                <Button 
                                    className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-9 px-4 font-semibold rounded-lg w-full sm:w-auto"
                                    onClick={() => { setEditingSprint(null); setSprintForm({title:'', startDate:'', endDate:'', quarter:'Q1', status:'planned'}); setIsSprintModalOpen(true); }}
                                >
                                    <Plus className="w-4 h-4 mr-2"/> Create Sprint
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-3 px-6 border-b border-slate-100">
                                <div className="col-span-3">Phase Title</div>
                                <div className="col-span-2">Quarter</div>
                                <div className="col-span-3">Duration</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {sprints.map(sp => (
                                    <div key={sp.id} className="grid grid-cols-12 items-center px-6 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-3 font-semibold text-slate-900 pr-4">
                                            <span className="truncate">{sp.title}</span>
                                        </div>
                                        <div className="col-span-2 text-sm text-slate-600">
                                            {sp.quarter}
                                        </div>
                                        <div className="col-span-3 text-sm text-slate-500">
                                            {new Date(sp.startDate).toLocaleDateString()} - {new Date(sp.endDate).toLocaleDateString()}
                                        </div>
                                        <div className="col-span-2">
                                            <Badge className={`px-2.5 py-0.5 text-[10px] uppercase border-0 ${
                                                sp.status === 'active' ? 'bg-emerald-500 text-white' :
                                                sp.status === 'completed' ? 'bg-slate-200 text-slate-600' :
                                                'bg-blue-500 text-white'
                                            }`}>
                                                {sp.status}
                                            </Badge>
                                        </div>
                                        <div className="col-span-2 text-right flex justify-end gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50 rounded-md" onClick={() => { setEditingSprint(sp); setSprintForm({ title: sp.title, startDate: sp.startDate.split('T')[0], endDate: sp.endDate.split('T')[0], quarter: sp.quarter, status: sp.status }); setIsSprintModalOpen(true); }}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50 rounded-md" onClick={() => handleDeleteSprint(sp.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {sprints.length === 0 && (
                                    <div className="text-center py-16 text-slate-500 text-sm">
                                        No sprints defined.
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200">
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
                     <label className="text-xs font-bold text-slate-700 uppercase">ART Name</label>
                     <Input placeholder="e.g. Platform Engineering" value={artForm.name} onChange={e => setArtForm({...artForm, name: e.target.value})} required className="h-10 border-slate-200 focus:border-[#0A1128]" />
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase">Department</label>
                     <Input placeholder="e.g. Engineering" value={artForm.department} onChange={e => setArtForm({...artForm, department: e.target.value})} required className="h-10 border-slate-200 focus:border-[#0A1128]" />
                 </div>
                 <div className="pt-4">
                     <Button type="submit" className="w-full bg-[#0A1128] hover:bg-[#141E3C] h-11 text-md font-bold text-white rounded-lg">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200">
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
                     <label className="text-xs font-bold text-slate-700 uppercase">Assign to ART</label>
                     <select 
                         className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0A1128]"
                         value={teamForm.artId}
                         onChange={e => setTeamForm({...teamForm, artId: e.target.value})}
                         required
                     >
                         <option value="" disabled>Select ART</option>
                         {arts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                     </select>
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase">Team Name</label>
                     <Input placeholder="e.g. Frontend Ninjas" value={teamForm.name} onChange={e => setTeamForm({...teamForm, name: e.target.value})} required className="h-10 border-slate-200 focus:border-[#0A1128]" />
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase">Description</label>
                     <Input placeholder="Short focus description" value={teamForm.description} onChange={e => setTeamForm({...teamForm, description: e.target.value})} className="h-10 border-slate-200 focus:border-[#0A1128]" />
                 </div>
                 <div className="pt-4">
                     <Button type="submit" className="w-full bg-[#0A1128] hover:bg-[#141E3C] h-11 text-md font-bold text-white rounded-lg">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200">
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
                         <label className="text-xs font-bold text-slate-700 uppercase">Sprint Title</label>
                         <Input placeholder="e.g. Innovation Sprint" value={sprintForm.title} onChange={e => setSprintForm({...sprintForm, title: e.target.value})} required className="h-10 border-slate-200 focus:border-[#0A1128]" />
                     </div>

                     <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-700 uppercase">Quarter</label>
                         <select 
                             className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0A1128]"
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
                         <label className="text-xs font-bold text-slate-700 uppercase">Status</label>
                         <select 
                             className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#0A1128]"
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
                         <label className="text-xs font-bold text-slate-700 uppercase">Start Date</label>
                         <Input type="date" value={sprintForm.startDate} onChange={e => setSprintForm({...sprintForm, startDate: e.target.value})} required className="h-10 border-slate-200 focus:border-[#0A1128]" />
                     </div>
                     <div className="space-y-2">
                         <label className="text-xs font-bold text-slate-700 uppercase">End Date</label>
                         <Input type="date" value={sprintForm.endDate} onChange={e => setSprintForm({...sprintForm, endDate: e.target.value})} required className="h-10 border-slate-200 focus:border-[#0A1128]" />
                     </div>
                 </div>

                 <div className="pt-4">
                     <Button type="submit" className="w-full bg-[#0A1128] hover:bg-[#141E3C] h-11 text-md font-bold text-white rounded-lg">
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