import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Briefcase, Calendar, Trash2, Check, X, Clock, Map, UserMinus, Trophy, LogOut, Settings2, Edit, Ban, CheckCircle, Camera } from "lucide-react";
import { auth, artManagerActions, adminActions, sprintStorage, employeeStorage, nominationStorage, StoredUser, ART, Team, StoredSprint, STORAGE_KEYS, userActions } from "@/lib/localStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Employee } from "@/types/employee";

const SCALING_FACTOR = 3.0;
const BASE_VOTE_VALUE = 50;

interface ManagedUserWithScore extends StoredUser {
    totalScore?: number;
}

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [pendingEmployees, setPendingEmployees] = useState<StoredUser[]>([]);
  const [managedEmployees, setManagedEmployees] = useState<ManagedUserWithScore[]>([]);
  const [allEmployeesList, setAllEmployeesList] = useState<Employee[]>([]); 
  const [arts, setArts] = useState<ART[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [sprints, setSprints] = useState<StoredSprint[]>([]);

  const [artName, setArtName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  
  const [sprintTitle, setSprintTitle] = useState("");
  const [sprintStartDate, setSprintStartDate] = useState("");
  const [sprintEndDate, setSprintEndDate] = useState("");
  
  const [approvalArtSelections, setApprovalArtSelections] = useState<Record<string, string>>({});
  const [selectedArtForTeam, setSelectedArtForTeam] = useState("");
  const [selectedArtToUpdate, setSelectedArtToUpdate] = useState(""); 
  const [managingTeam, setManagingTeam] = useState<Team | null>(null);
  const [isArtUpdateModalOpen, setIsArtUpdateModalOpen] = useState(false); 

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = auth.getCurrentUser('art-manager');
    if (!user || user.role !== 'art-manager') {
        navigate("/");
        return;
    }
    setCurrentUser(user);
    loadData(user.id);
  }, [navigate]);

  const loadData = (managerId: string) => {
    setPendingEmployees(artManagerActions.getPendingEmployees());
    
    const allArts = artManagerActions.getARTs();
    const myArts = allArts.filter(a => a.managerId === managerId);
    setArts(myArts);

    if (myArts.length > 0 && !selectedArtToUpdate) {
        setSelectedArtToUpdate(myArts[0].id);
        setArtName(myArts[0].name);
        setDeptName(myArts[0].department);
    }

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
        if (activeS) {
            const teamSize = allEmployees.filter(e => e.teamId === emp.teamId).length;
            const potentialVoters = Math.max(1, teamSize - 1); 
            const fairnessMultiplier = SCALING_FACTOR / Math.sqrt(potentialVoters);
            
            const activeStart = new Date(activeS.startDate).getTime();
            const activeEnd = new Date(activeS.endDate).getTime();

            const received = allNoms.filter(n => n.nomineeId === emp.id && new Date(n.timestamp).getTime() >= activeStart && new Date(n.timestamp).getTime() <= activeEnd);
            
            score += received.length * Math.round(BASE_VOTE_VALUE * fairnessMultiplier);
        }
        return { ...emp, totalScore: score };
    });

    setManagedEmployees(empsWithScores);
  };

  const handleApprove = (id: string) => {
    if (arts.length === 0) {
         toast.error("Please create your ART first.");
         return;
    }
    
    const artToAssign = approvalArtSelections[id] || arts[0].id;
    const selectedArtData = arts.find(a => a.id === artToAssign);

    if(artManagerActions.approveEmployee(id, artToAssign)) {
        toast.success(`Employee approved & assigned to ${selectedArtData?.name}`);
        loadData(currentUser.id);
    }
  };

  const handleReject = (id: string) => {
    if(adminActions.rejectUser(id)) {
        toast.success("Request rejected");
        loadData(currentUser.id);
    }
  };

  const handleRevokeAccess = (id: string) => {
    if(adminActions.rejectUser(id)) {
        artManagerActions.removeEmployeeFromTeam(id);
        toast.success("Employee access has been revoked.");
        loadData(currentUser.id);
    }
  };

  const handleRestoreAccess = (id: string) => {
    if(adminActions.approveUser(id)) {
        toast.success("Employee access restored.");
        loadData(currentUser.id);
    }
  };

  const handleCreateART = (e: React.FormEvent) => {
    e.preventDefault();
    artManagerActions.createART(artName, deptName, currentUser.id);
    toast.success("ART Created Successfully!");
    loadData(currentUser.id);
  };

  const handleUpdateART = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = selectedArtToUpdate || (arts.length > 0 ? arts[0].id : null);
    if (!targetId) return;

    const allArts = JSON.parse(localStorage.getItem(STORAGE_KEYS.ARTS) || "[]");
    const artIndex = allArts.findIndex((a: ART) => a.id === targetId);
    
    if (artIndex !== -1) {
        allArts[artIndex].name = artName;
        allArts[artIndex].department = deptName;
        allArts[artIndex].updatedAt = new Date().toISOString(); 
        localStorage.setItem(STORAGE_KEYS.ARTS, JSON.stringify(allArts));
        toast.success("ART Details Updated!");
        loadData(currentUser.id);
    }
  };

  const handleArtSelection = (artId: string) => {
    setSelectedArtToUpdate(artId);
    const art = arts.find(a => a.id === artId);
    if (art) {
        setArtName(art.name);
        setDeptName(art.department);
    }
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (arts.length === 0) return toast.error("Create an ART first");
    
    const targetArtId = selectedArtForTeam || arts[0].id;
    
    artManagerActions.createTeam(targetArtId, teamName, teamDesc);
    toast.success("Specific Team Created!");
    setTeamName(""); setTeamDesc("");
    loadData(currentUser.id);
  };

  const handleDeleteTeam = (id: string) => {
    artManagerActions.deleteTeam(id);
    toast.success("Team deleted");
    setManagingTeam(null); 
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) { 
              toast.error("Image is too large. Please choose an image under 1MB.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              if (currentUser && userActions.updateProfilePicture(currentUser.id, base64String)) {
                  setCurrentUser({ ...currentUser, profilePicture: base64String });
                  toast.success("Profile picture updated successfully!");
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const activeSprint = sprints.find(s => s.status === 'active');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* BEAUTIFUL WELCOME BANNER WITH PROMINENT PROFILE UPLOAD */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-indigo-500/20">
            <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    
                    <div 
                        className="relative group cursor-pointer shrink-0" 
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload Profile Picture"
                    >
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold border-4 border-white/40 overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:border-white/60">
                            {currentUser?.profilePicture ? (
                                <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                currentUser?.firstName?.charAt(0) || 'M'
                            )}
                        </div>
                        <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg border-2 border-indigo-600 text-indigo-600 transition-transform duration-300 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-700">
                            <Camera className="w-4 h-4" />
                        </div>
                    </div>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleImageUpload} 
                        accept="image/*" 
                        className="hidden" 
                    />

                    <div className="text-center md:text-left mt-2 md:mt-0">
                        <h2 className="text-3xl font-bold mb-2">Welcome aboard, {currentUser?.firstName}! 👋</h2>
                        <p className="text-indigo-100 text-lg max-w-xl">
                            Manage your Agile Release Trains, approve team members, and control sprint phases.
                        </p>
                    </div>
                </div>
                <Button variant="secondary" onClick={() => { auth.logout(); navigate("/"); }} className="bg-white/20 text-white hover:bg-white/30 border-0 backdrop-blur-md whitespace-nowrap mt-4 md:mt-0">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
            </div>
        </section>

        {/* 1. PENDING REQUESTS */}
        <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2 text-amber-800"><Clock className="w-5 h-5"/> Pending Employee Requests ({pendingEmployees.length})</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {pendingEmployees.length === 0 ? <p className="text-sm text-amber-600 italic">No pending requests</p> : 
                    pendingEmployees.map(req => (
                        <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-100 flex justify-between items-center shadow-sm">
                            <div><p className="font-bold text-slate-900">{req.firstName} {req.lastName}</p><p className="text-xs text-slate-500">Requested: {new Date(req.createdAt).toLocaleDateString()}</p></div>
                            <div className="flex items-center gap-2">
                                
                                <span className="text-xs text-slate-500 mr-2 flex items-center gap-2">
                                    Assigning to: 
                                    {arts.length === 0 ? (
                                        <Badge variant="outline" className="bg-slate-50 text-slate-500">No ARTs Available</Badge>
                                    ) : arts.length === 1 ? (
                                        <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700">{arts[0].name}</Badge>
                                    ) : (
                                        <select 
                                            className="text-xs border border-indigo-200 rounded-md px-2 py-1 bg-indigo-50 text-indigo-800 font-medium outline-none cursor-pointer hover:border-indigo-400 transition-colors"
                                            value={approvalArtSelections[req.id] || arts[0].id}
                                            onChange={e => setApprovalArtSelections({...approvalArtSelections, [req.id]: e.target.value})}
                                        >
                                            {arts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    )}
                                </span>

                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleReject(req.id)}><X className="w-4 h-4" /></Button>
                                <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(req.id)} disabled={arts.length === 0}><Check className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))
                }
            </CardContent>
        </Card>

        {/* 2. MANAGED EMPLOYEES LIST WITH REVOKE ACCESS */}
        <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-slate-800"><Users className="w-5 h-5 text-blue-600"/> Managed Employees</CardTitle></CardHeader>
            <CardContent>
                {managedEmployees.length === 0 ? <p className="text-sm text-slate-400 italic">No employees managed yet.</p> :
                    <div className="space-y-2">
                        <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase border-b pb-2 px-3">
                            <div className="col-span-4">Employee Name</div>
                            <div className="col-span-3">Specific ART</div>
                            <div className="col-span-2">Status</div>
                            <div className="col-span-3 text-right">Actions</div>
                        </div>
                        <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {managedEmployees.map(emp => (
                                <div key={emp.id} className="grid grid-cols-12 items-center p-3 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                    <div className="col-span-4 font-semibold text-slate-900 flex flex-col">
                                        <span>{emp.firstName} {emp.lastName}</span>
                                        {emp.createdBy === 'system_dummy' && <span className="text-[10px] text-slate-400 font-normal">Dummy Account</span>}
                                    </div>
                                    <div className="col-span-3">
                                        <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-100">
                                            {arts.find(a => a.id === emp.artId)?.name || 'Assigned'}
                                        </Badge>
                                    </div>
                                    <div className="col-span-2">
                                        <Badge variant="outline" className={
                                            emp.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                            emp.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                        }>
                                            {emp.status}
                                        </Badge>
                                    </div>
                                    <div className="col-span-3 text-right flex justify-end">
                                        {emp.createdBy !== 'system_dummy' && (
                                            emp.status === 'approved' ? (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors" 
                                                    onClick={() => handleRevokeAccess(emp.id)} 
                                                    title="Revoke Access"
                                                >
                                                    <Ban className="w-4 h-4 mr-1 hidden sm:block" /> Disable
                                                </Button>
                                            ) : emp.status === 'rejected' ? (
                                                <Button 
                                                    size="sm" 
                                                    variant="ghost" 
                                                    className="h-8 px-2 text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors" 
                                                    onClick={() => handleRestoreAccess(emp.id)} 
                                                    title="Restore Access"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1 hidden sm:block" /> Restore
                                                </Button>
                                            ) : null
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                }
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* SETUP & LIST ARTS */}
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Map className="w-5 h-5 text-indigo-600"/> Your ARTs</CardTitle></CardHeader>
                    <CardContent>
                        {arts.length > 0 && (
                            <div className="space-y-3 mb-6 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                {arts.map(art => (
                                     <div key={art.id} className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm">
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600 shrink-0">
                                                 <Briefcase className="w-5 h-5"/>
                                             </div>
                                             <div>
                                                <p className="text-sm text-indigo-900 font-bold leading-tight">{art.name}</p>
                                                <p className="text-[11px] text-indigo-600 font-medium">{art.department}</p>
                                                <p className="text-[9px] text-indigo-400 mt-1 font-mono">
                                                  Created: {art.createdAt ? new Date(art.createdAt).toLocaleDateString() : 'N/A'} | Updated: {art.updatedAt ? new Date(art.updatedAt).toLocaleDateString() : 'N/A'}
                                                </p>
                                             </div>
                                         </div>
                                         <Badge className="bg-indigo-200 text-indigo-800 hover:bg-indigo-200 border-0 text-[10px]">Active</Badge>
                                     </div>
                                ))}
                            </div>
                        )}

                        {arts.length > 0 ? (
                            <div className="pt-4 border-t border-slate-100">
                                <Button 
                                    variant="outline" 
                                    className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                    onClick={() => {
                                        if(!selectedArtToUpdate && arts.length > 0) handleArtSelection(arts[0].id);
                                        setIsArtUpdateModalOpen(true);
                                    }}
                                >
                                    <Edit className="w-4 h-4 mr-2" /> Update ART Details
                                </Button>
                            </div>
                        ) : (
                            <div className="pt-4 border-t border-slate-100">
                                <h4 className="text-sm font-bold mb-4 text-slate-800">Create Your First ART</h4>
                                <form onSubmit={handleCreateART} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">ART Name</label>
                                        <Input placeholder="Specific ART Name (e.g. Platform)" value={artName} onChange={e => setArtName(e.target.value)} required className="bg-slate-50 border-slate-200" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Department</label>
                                        <Input placeholder="Department" value={deptName} onChange={e => setDeptName(e.target.value)} required className="bg-slate-50 border-slate-200" />
                                    </div>
                                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2">
                                        Add ART
                                    </Button>
                                </form>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            {/* MANAGE TEAMS */}
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600"/> Manage Specific Teams</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        {arts.length > 0 ? (
                            <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
                                <h4 className="text-sm font-bold mb-4 text-slate-800">Create New Specific Team</h4>
                                <form onSubmit={handleCreateTeam} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    
                                    {arts.length > 1 && (
                                        <div className="md:col-span-2 space-y-1.5">
                                            <label className="text-xs font-bold text-slate-700">Assign to Specific ART</label>
                                            <select 
                                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                                value={selectedArtForTeam || arts[0].id}
                                                onChange={e => setSelectedArtForTeam(e.target.value)}
                                            >
                                                {arts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Team Name</label>
                                        <Input placeholder="e.g. Frontend Ninjas" value={teamName} onChange={e => setTeamName(e.target.value)} required className="bg-white" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700">Description</label>
                                        <Input placeholder="Short focus description" value={teamDesc} onChange={e => setTeamDesc(e.target.value)} className="bg-white" />
                                    </div>
                                    <Button type="submit" className="md:col-span-2 bg-slate-900 text-white hover:bg-slate-800 py-5">Add Team</Button>
                                </form>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 border-2 border-dashed rounded-xl">Create an ART first to add teams.</div>
                        )}

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your specific Active Teams</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {teams.map(t => {
                                    const members = managedEmployees.filter(e => e.teamId === t.id);
                                    const sortedMembers = [...members].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
                                    const top3 = sortedMembers.filter(m => (m.totalScore || 0) > 0).slice(0, 3);

                                    return (
                                        <div 
                                            key={t.id} 
                                            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-indigo-300 cursor-pointer group transition-all"
                                            onClick={() => setManagingTeam(t)}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <p className="font-bold text-slate-900 text-lg group-hover:text-indigo-600 transition-colors">{t.name}</p>
                                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide mb-1">{arts.find(a => a.id === t.artId)?.name}</p>
                                                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{t.description}</p>
                                                </div>
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-0">{members.length} Members</Badge>
                                            </div>
                                            
                                            <div className="bg-gradient-to-br from-amber-50 to-yellow-50/30 rounded-xl p-3 border border-amber-100 mb-4">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2">
                                                    <Trophy className="w-3.5 h-3.5" /> Top 3 Performers
                                                </div>
                                                {top3.length === 0 ? (
                                                    <p className="text-[11px] text-amber-600/70 italic text-center py-2">No scores logged yet</p>
                                                ) : (
                                                    <div className="space-y-1.5">
                                                        {top3.map((m, idx) => (
                                                            <div key={`top_${m.id}`} className="flex justify-between items-center bg-white/80 p-1.5 rounded-lg border border-amber-100/50 text-xs shadow-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold w-4 text-center">
                                                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}
                                                                    </span>
                                                                    <span className="font-semibold text-slate-800 truncate max-w-[100px]">{m.firstName} {m.lastName}</span>
                                                                </div>
                                                                <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-0">{m.totalScore} pts</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-center text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                <Settings2 className="w-3.5 h-3.5" /> Click to Manage Team Members
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SPRINT MANAGEMENT ONLY (AWARDS REMOVED) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between w-full">
                            <span className="flex items-center gap-2"><Calendar className="w-5 h-5 text-emerald-600"/> Manage Sprint Phase</span>
                            {activeSprint && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Active: {activeSprint.title}</Badge>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-xs text-slate-500 mb-2">Configure precise quarterly intervals for your teams. Creating a new phase will automatically complete the previous active one.</p>
                        
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Sprint Title</label>
                            <Input placeholder="e.g. Q3 Release Phase" value={sprintTitle} onChange={e => setSprintTitle(e.target.value)} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">Start Date</label>
                                <Input type="date" value={sprintStartDate} onChange={e => setSprintStartDate(e.target.value)} required />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700">End Date</label>
                                <Input type="date" value={sprintEndDate} onChange={e => setSprintEndDate(e.target.value)} required />
                            </div>
                        </div>

                        <Button className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2" onClick={() => {
                            if(!sprintTitle.trim() || !sprintStartDate || !sprintEndDate) {
                                toast.error("Please fill in the title and both dates.");
                                return;
                            }
                            if (new Date(sprintStartDate) > new Date(sprintEndDate)) {
                                toast.error("Start date must be before the end date.");
                                return;
                            }
                            sprintStorage.addSprint(sprintTitle.trim(), sprintStartDate, sprintEndDate, currentUser.id);
                            setSprintTitle(""); setSprintStartDate(""); setSprintEndDate(""); 
                            loadData(currentUser.id); toast.success("New Scheduled Phase Started!");
                        }}>Save Scheduled Sprint</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>

      {/* OVERLAY MODAL: TEAM MANAGEMENT */}
      {managingTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative">
                      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                      <div>
                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-0 mb-2 uppercase tracking-widest text-[9px]">
                              {arts.find(a => a.id === managingTeam.artId)?.name}
                          </Badge>
                          <h2 className="text-2xl font-bold text-slate-900">{managingTeam.name}</h2>
                          <p className="text-sm text-slate-500 mt-1">{managingTeam.description}</p>
                      </div>
                      <button onClick={() => setManagingTeam(null)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-100 transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                      <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                              <Users className="w-4 h-4 text-indigo-500"/> Enrolled Team Members
                          </h3>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                              {managedEmployees.filter(e => e.teamId === managingTeam.id).length} Total
                          </Badge>
                      </div>
                      
                      <div className="space-y-3">
                         {managedEmployees.filter(e => e.teamId === managingTeam.id).map(m => {
                             const empRecord = allEmployeesList.find(e => e.id === m.id);
                             
                             return (
                                 <div key={m.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-white shadow-sm hover:shadow transition-all group">
                                     <div className="flex items-center gap-4">
                                         <img 
                                            src={m.profilePicture || empRecord?.profilePicture || `https://ui-avatars.com/api/?name=${m.firstName}+${m.lastName}&background=random`} 
                                            alt="" 
                                            className="w-10 h-10 rounded-full border border-slate-200 object-cover" 
                                         />
                                         <div>
                                             <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                {m.firstName} {m.lastName} 
                                                {m.createdBy === 'system_dummy' && <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-400 h-4 px-1 border-slate-200 font-normal">Dummy Account</Badge>}
                                             </p>
                                             <p className="text-xs text-slate-500">{empRecord?.jobTitle || "Team Member"}</p>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-4">
                                         <div className="text-right hidden sm:block">
                                             <span className="text-lg font-bold text-amber-600">{m.totalScore || 0}</span>
                                             <span className="text-[10px] text-amber-600/70 font-bold uppercase tracking-wider block leading-none">Points</span>
                                         </div>
                                         <Button size="sm" variant="outline" className="text-red-600 border-red-100 bg-red-50 hover:bg-red-600 hover:text-white transition-colors h-8" onClick={() => handleRemoveFromTeam(m.id)}>
                                             <UserMinus className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Remove</span>
                                         </Button>
                                     </div>
                                 </div>
                             );
                         })}
                         {managedEmployees.filter(e => e.teamId === managingTeam.id).length === 0 && (
                             <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                                 <UserMinus className="w-8 h-8 mb-2 opacity-50" />
                                 <p className="text-sm font-medium">No members in this team yet.</p>
                             </div>
                         )}
                      </div>
                  </div>
                  
                  <div className="p-5 border-t border-slate-200 bg-red-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div>
                          <h4 className="text-sm font-bold text-red-800 flex items-center gap-2">Danger Zone</h4>
                          <p className="text-xs text-red-600/80 mt-0.5">Permanently delete this team and unassign all its members.</p>
                      </div>
                      <Button variant="destructive" className="bg-red-600 hover:bg-red-700 shadow-sm w-full sm:w-auto" onClick={() => handleDeleteTeam(managingTeam.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Team
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* OVERLAY MODAL: UPDATE ART DETAILS */}
      {isArtUpdateModalOpen && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
                 <div>
                     <h2 className="text-xl font-bold text-slate-900">Update ART Details</h2>
                     <p className="text-sm text-slate-500 mt-1">Modify your Release Train setup</p>
                 </div>
                 <button onClick={() => setIsArtUpdateModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-100 transition-colors">
                     <X className="w-5 h-5" />
                 </button>
             </div>
             <form onSubmit={(e) => { handleUpdateART(e); setIsArtUpdateModalOpen(false); }} className="p-6 space-y-5">
                 {arts.length > 1 && (
                     <div className="space-y-1.5">
                         <label className="text-xs font-bold text-slate-700">Select ART to Update</label>
                         <select 
                             className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                             value={selectedArtToUpdate}
                             onChange={e => handleArtSelection(e.target.value)}
                         >
                             {arts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                         </select>
                     </div>
                 )}
                 <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-700">ART Name</label>
                     <Input placeholder="Specific ART Name (e.g. Platform)" value={artName} onChange={e => setArtName(e.target.value)} required className="h-11" />
                 </div>
                 <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-700">Department</label>
                     <Input placeholder="Department" value={deptName} onChange={e => setDeptName(e.target.value)} required className="h-11" />
                 </div>
                 <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-2 py-6 text-md font-bold">
                     Save Changes
                 </Button>
             </form>
          </div>
       </div>
      )}
    </div>
  );
};

export default ManagerDashboard;