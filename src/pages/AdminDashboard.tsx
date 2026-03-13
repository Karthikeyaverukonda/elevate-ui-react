import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, Shield, Check, X, Clock, Database, Briefcase, Award, LogOut, RefreshCw, Camera, Plus, Edit, Trash2, LayoutDashboard, Search, ChevronRight, Zap, Crown, Settings, Target, Map, Network, Trophy, User } from "lucide-react";
import { adminActions, artManagerActions, awardStorage, StoredUser, STORAGE_KEYS, userActions, ART, StoredAward } from "@/lib/localStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type DashboardTab = 'overview' | 'requests' | 'directory' | 'awards';
type DirectoryView = 'Art Manager' | 'Admin';

// Robust helper to extract a human name, regardless of how they signed up
const getDisplayName = (u: any) => {
    if (!u) return 'Unknown User';
    // Fallback for older data structures
    if (u.name && !u.firstName) return u.name;
    
    const first = u.firstName || '';
    const last = u.lastName || '';
    const combined = `${first} ${last}`.trim();
    if (!combined) return 'Unknown User';
    
    // Mask the confusing dummy data names so they look like real humans
    if (combined.toLowerCase() === 'system admin') return 'Alice (Admin)';
    if (combined.toLowerCase() === 'tech lead') return 'Bob (Manager)';
    
    return combined;
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [directoryView, setDirectoryView] = useState<DirectoryView>('Art Manager');
  
  const [pendingRequests, setPendingRequests] = useState<StoredUser[]>([]);
  const [allUsers, setAllUsers] = useState<StoredUser[]>([]);
  const [allArts, setAllArts] = useState<ART[]>([]);
  const [awards, setAwards] = useState<StoredAward[]>([]);

  const [directorySearch, setDirectorySearch] = useState("");
  const [awardSearch, setAwardSearch] = useState("");

  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<StoredAward | null>(null);
  const [awardForm, setAwardForm] = useState({ name: '', description: '' ,image: ''});

  const [admindashboardTotalUsers,setAdmindashboardTotalUsers] = useState(0);
  const [admindashboardActiveARTs,setAdmindashboardActiveARTs] = useState(0);
  const [admindashboardTotalTeams,setAdmindashboardTotalTeams] = useState(0);
  const [admindashboardNominations,setAdmindashboardNominations] = useState(0);
  const [selectedAwardId, setSelectedAwardId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(() => {
    fetch('http://127.0.0.1:8000/api/admin-dashboard/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Signup failed');
          }
          return response.json();
        })
        .then((data) => {
            setAdmindashboardTotalUsers(data.total_users);
            setAdmindashboardActiveARTs(data.total_arts);
            setAdmindashboardTotalTeams(data.total_teams);
            setAdmindashboardNominations(data.all_time_nominations);
            console.log("Fetched admin dashboard data:", data);
          }).catch((err: any) => {
          toast.error(err.message || 'Signup failed');
        });
          
    setPendingRequests(adminActions.getPendingRequests());
    setAllUsers(adminActions.getAllUsers());
    setAllArts(artManagerActions.getARTs());
    setAwards(awardStorage.getAwards());
    console.log("awards data ", awards);
  }, []);
        
  useEffect(() => {
    const user_id = sessionStorage.getItem(STORAGE_KEYS.USER_ID);
    const user_login = sessionStorage.getItem(STORAGE_KEYS.USER_LOGIN);
    const user_role = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE);
    if (!user_id || !user_login || !user_role || user_role !== 'Admin') {
        navigate("/");
        return;
    }
    setCurrentUser({ id: user_id, login: user_login, role: user_role });
    loadData();

    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);
    
    return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, [navigate, loadData]);

  const handleApprove = (req: Readonly<StoredUser>) => {
    if(adminActions.approveUser(req.id)) {
        toast.success("User access approved.");
        loadData();
    }
  };

  const handleReject = (id: string) => {
    if(adminActions.rejectUser(id)) {
        toast.success("User access has been revoked.");
        loadData();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) return toast.error("Image is too large. Please choose an image under 1MB.");
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

  const handleSaveAward = (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (!awardForm.name.trim() || !awardForm.description.trim() || !awardForm.image.trim()) {
              return toast.error("Please fill in all fields.");
          }
          
          if (editingAward) {
              awardStorage.updateAward(editingAward.award_id, awardForm.name.trim(), awardForm.description.trim(), awardForm.image.trim());
              toast.success("Award updated successfully!");
          } else {
              awardStorage.addAward(awardForm.name.trim(), awardForm.description.trim(), awardForm.image.trim());
              toast.success("New award created!");
          }
          setIsAwardModalOpen(false);
          loadData();
      } catch (error) {
          console.error("Error saving award:", error);
          toast.error("Failed to save award. Check console for details.");
      }
  };

  const handleDeleteAward = (id: string) => {
      awardStorage.deleteAward(id);
      toast.success("Award deleted permanently.");
      loadData();
  };

  const registeredSystemUsers = allUsers.filter(u => u.status !== 'pending' && u.role === directoryView);
  const filteredDirectory = registeredSystemUsers.filter(u => 
      getDisplayName(u).toLowerCase().includes(directorySearch.toLowerCase())
  );
  const filteredAwards = awards.filter(a => 
      a.award_name.toLowerCase().includes(awardSearch.toLowerCase()) || 
      a.award_description.toLowerCase().includes(awardSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-12 relative text-slate-900 font-sans">
      
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
                            getDisplayName(currentUser).charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#0A1128] p-1.5 rounded-full shadow-md text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-3.5 h-3.5" />
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <div className="flex-1">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Admin Console</h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Welcome back, <span className="text-slate-700 font-bold">{getDisplayName(currentUser)}</span>. Oversee platform health and system settings.
                    </p>
                </div>
            </div>
            
            <div className="mt-8 md:mt-0 flex gap-3 shrink-0">
                <Button variant="outline" onClick={() => { loadData(); toast.info("System refreshed"); }} className="bg-white text-slate-600 hover:bg-slate-50 border-slate-200 h-11 px-5 rounded-xl font-semibold">
                    <RefreshCw className="w-4 h-4 mr-2" /> Sync
                </Button>
                <Button variant="secondary" onClick={() => {navigate("/"); }} className="bg-white border border-slate-200 text-[#0A1128] hover:bg-slate-50 shadow-sm h-11 px-6 font-bold rounded-xl">
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
                {pendingRequests.length > 0 && <Badge className={`ml-2 px-1.5 py-0 h-5 border-0 ${activeTab === 'requests' ? 'bg-white text-[#0A1128]' : 'bg-[#0A1128]/10 text-[#0A1128]'}`}>{pendingRequests.length}</Badge>}
            </Button>
            <Button variant={activeTab === 'directory' ? 'default' : 'ghost'} onClick={() => setActiveTab('directory')} className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === 'directory' ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}>
                <Shield className="w-4 h-4 mr-2" /> System Directory
            </Button>
            <Button variant={activeTab === 'awards' ? 'default' : 'ghost'} onClick={() => setActiveTab('awards')} className={`rounded-xl px-5 h-10 font-bold transition-all ${activeTab === 'awards' ? 'bg-[#0A1128] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100 hover:text-[#0A1128]'}`}>
                <Award className="w-4 h-4 mr-2" /> System Awards
            </Button>
        </div>

        {/* CONTENT AREA */}
        <div className="mt-4">
            
            {/* VIEW: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    
                    {/* ACTION REQUIRED PROMPT */}
                    {pendingRequests.length > 0 && (
                        <Card className="border border-[#0A1128]/20 shadow-sm rounded-[2rem] bg-white cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('requests')}>
                            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-[#0A1128]/5 rounded-xl shrink-0">
                                        <Zap className="w-6 h-6 text-[#0A1128]" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-slate-900">Action Required</h3>
                                        <p className="text-slate-500 text-sm mt-1 font-medium">
                                            You have <strong>{pendingRequests.length}</strong> new access request(s) waiting for approval.
                                        </p>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-[#0A1128] flex items-center">
                                    Review Requests <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* NEAT STATS GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:border-[#0A1128]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group" onClick={() => setActiveTab('directory')}>
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Users className="w-32 h-32 text-slate-900 animate-float" />
                            </div>
                            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#0A1128] transition-colors">Total Users</p>
                                        <h3 className="text-4xl font-extrabold text-slate-900">{admindashboardTotalUsers}</h3>
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

                        <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:border-[#0A1128]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Map className="w-32 h-32 text-slate-900 animate-float-reverse" />
                            </div>
                            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#0A1128] transition-colors">Active ARTs</p>
                                        <h3 className="text-4xl font-extrabold text-slate-900">{admindashboardActiveARTs}</h3>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0A1128]/5 group-hover:text-[#0A1128] transition-all border border-slate-100/50">
                                        <Map className="w-7 h-7" />
                                    </div>
                                </div>
                                <div className="mt-auto flex items-center text-xs font-semibold text-slate-400">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Synced from backend
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:border-[#0A1128]/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Network className="w-32 h-32 text-slate-900 animate-float" />
                            </div>
                            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#0A1128] transition-colors">Total Teams</p>
                                        <h3 className="text-4xl font-extrabold text-slate-900">{admindashboardTotalTeams}</h3>
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

                        <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:border-[#0A1128]/30 hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                                <Trophy className="w-32 h-32 text-slate-900 animate-float-reverse" />
                            </div>
                            <CardContent className="p-6 relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 group-hover:text-[#0A1128] transition-colors">Nominations</p>
                                        <h3 className="text-4xl font-extrabold text-slate-900">{admindashboardNominations}</h3>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#0A1128]/5 group-hover:text-[#0A1128] transition-all border border-slate-100/50">
                                        <Trophy className="w-7 h-7" />
                                    </div>
                                </div>
                                <div className="mt-auto flex items-center text-xs font-semibold text-slate-400">
                                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Synced from backend
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* NEAT TEXTUAL OVERVIEW SECTION */}
                    <div className="mt-10">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <LayoutDashboard className="w-6 h-6 text-[#0A1128]" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">📘 Dashboard Overview</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-[#0A1128]/5 text-[#0A1128]">
                                            <Settings className="w-6 h-6"/>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">📋 Admin Responsibilities</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">As a System Administrator, you hold the highest level of clearance. Your responsibilities include verifying and approving new Admins, ART Managers, overseeing platform health, and ensuring system-wide compliance with organizational goals.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-[#0A1128]/5 text-[#0A1128]">
                                            <Award className="w-6 h-6"/>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">🏆 Recognition Program</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">You control the global recognition badges available across all departments. Creating engaging, specific award categories ensures employees feel appropriately valued for their unique contributions to their specific Release Trains.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-[#0A1128]/5 text-[#0A1128]">
                                            <Target className="w-6 h-6"/>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">🛠 Platform Features</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">The platform supports multi-tiered architecture (Admin &gt; ART Manager &gt; Team Member). Use your directory tools to monitor domain allocations and immediately revoke access for offboarded employees to maintain data security.</p>
                                </CardContent>
                            </Card>

                            <Card className="border border-slate-200 shadow-sm rounded-3xl bg-white hover:shadow-md transition-all">
                                <CardContent className="p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-3 rounded-xl bg-[#0A1128]/5 text-[#0A1128]">
                                            <Shield className="w-6 h-6"/>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">⚙ System Guidelines</h4>
                                    </div>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">Always verify user identities before granting platform access. Only delete global awards if absolutely necessary, as this may impact historical analytics. Rely on the automated database sync to populate accurate employee metrics.</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW: ACCESS REQUESTS */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-6 sm:px-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="mb-2 sm:mb-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="w-5 h-5 text-slate-500" />
                                        <CardTitle className="text-xl font-bold text-slate-900">Pending Access Requests</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium text-slate-500">
                                        Review and securely approve access requests for new System Administrators and ART Managers.
                                    </CardDescription>
                                </div>
                                {pendingRequests.length > 0 && (
                                    <Badge className="bg-[#0A1128]/10 text-[#0A1128] px-4 py-1.5 text-sm rounded-lg border-0 font-bold shrink-0">
                                        {pendingRequests.length} Pending
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingRequests.length === 0 ? (
                                <div className="py-24 text-center bg-slate-50/30">
                                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-sm">
                                        <Check className="w-10 h-10 text-emerald-400" />
                                    </div>
                                    <p className="text-lg font-bold text-slate-600">All caught up!</p>
                                    <p className="text-sm text-slate-500 mt-1">No pending requests right now.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {pendingRequests.map((req, index) => {
                                        const displayName = getDisplayName(req);
                                        return (
                                        <div key={`${req.id}-${index}`} className="p-6 px-6 sm:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-4 min-w-[250px]">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-lg border border-slate-200 uppercase">
                                                    {displayName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-lg">{displayName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className={`font-semibold bg-slate-50 ${req.role === 'Admin' ? 'text-purple-700' : 'text-[#0A1128]'}`}>
                                                            {req.role === 'Admin' ? 'System Admin' : 'Train Manager'}
                                                        </Badge>
                                                        <span className="text-xs text-slate-500">
                                                            Requested: {new Date(req.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-1 text-sm text-slate-500 px-4 py-2 border-l border-slate-200 font-medium">
                                                <span className="text-slate-700 font-bold">{displayName}</span> {req.role === 'Admin' 
                                                    ? "is requesting full administrative system oversight." 
                                                    : "is requesting access and will configure their ART and Department upon first login."
                                                }
                                            </div>
                                            <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
                                                <Button variant="outline" className="h-10 text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200 px-5 font-bold rounded-lg" onClick={() => handleReject(req.id)}>
                                                    Deny
                                                </Button>
                                                <Button className="h-10 bg-[#0A1128] hover:bg-[#141E3C] text-white px-6 font-bold rounded-lg" onClick={() => handleApprove(req)}>
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

            {/* VIEW: SYSTEM DIRECTORY */}
            {activeTab === 'directory' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-6 sm:px-8">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div className="mb-2 lg:mb-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Shield className="w-5 h-5 text-slate-500" />
                                        <CardTitle className="text-xl font-bold text-slate-900">System Directory</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium text-slate-500">
                                        Manage approved personnel, monitor domain allocations, and track or revoke account status.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                                    <div className="bg-slate-100 p-1 rounded-lg inline-flex w-full sm:w-auto shadow-inner">
                                        <button 
                                            className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${directoryView === 'Art Manager' ? 'bg-white shadow-sm text-[#0A1128]' : 'text-slate-500 hover:text-slate-700'}`}
                                            onClick={() => setDirectoryView('Art Manager')}
                                        >
                                            Train Managers
                                        </button>
                                        <button 
                                            className={`px-5 py-1.5 rounded-md text-sm font-bold transition-all ${directoryView === 'Admin' ? 'bg-white shadow-sm text-[#0A1128]' : 'text-slate-500 hover:text-slate-700'}`}
                                            onClick={() => setDirectoryView('Admin')}
                                        >
                                            Administrators
                                        </button>
                                    </div>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input 
                                            placeholder="Search directory..." 
                                            className="pl-9 h-10 bg-white border-slate-200 rounded-lg text-sm focus:border-[#0A1128]"
                                            value={directorySearch}
                                            onChange={(e) => setDirectorySearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-3 px-6 sm:px-8 border-b border-slate-100">
                                <div className="col-span-5 md:col-span-4">User Profile</div>
                                <div className="col-span-4 md:col-span-5">Role & Domain</div>
                                <div className="col-span-3 md:col-span-3 text-right">System Status</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredDirectory.map((user, index) => {
                                    const managerArt = allArts.find(a => a.managerId === user.id);
                                    const isAdmin = user.role === 'Admin';
                                    const displayName = getDisplayName(user);
                                    
                                    return (
                                        <div key={`${user.id}-${index}`} className="grid grid-cols-12 items-center px-6 sm:px-8 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <div className="col-span-5 md:col-span-4 font-semibold text-slate-900 flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm shrink-0 overflow-hidden border bg-slate-50 border-slate-200 text-slate-700 uppercase`}>
                                                    {user.profilePicture ? (
                                                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{displayName.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="truncate pr-1 text-sm font-bold">{displayName}</span>
                                                    {user.createdBy === 'system_dummy' && <span className="text-[10px] text-slate-400 font-medium">Test Account</span>}
                                                </div>
                                            </div>
                                            <div className="col-span-4 md:col-span-5 text-sm flex flex-col min-w-0 pr-4">
                                                {isAdmin ? (
                                                    <>
                                                        <span className="font-semibold text-slate-900 flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-purple-600"/> System Administrator</span>
                                                        <span className="text-xs text-slate-500 mt-0.5">Global System Access</span>
                                                    </>
                                                ) : managerArt ? (
                                                    <>
                                                      <span className="font-semibold text-[#0A1128] flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> {managerArt.name}</span>
                                                      <span className="text-xs text-slate-500 mt-0.5 truncate">Train Manager • {managerArt.department}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                      <span className="font-semibold text-slate-700 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> Train Manager</span>
                                                      <span className="text-xs text-slate-400 mt-0.5 italic">Awaiting ART Configuration</span>
                                                    </>
                                                )}
                                            </div>
                                            <div className="col-span-3 md:col-span-3 text-right flex justify-end items-center">
                                                <Badge variant="outline" className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border-0 shadow-sm ${
                                                    user.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                                                    user.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {user.status === 'approved' ? 'Active' : user.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredDirectory.length === 0 && (
                                    <div className="text-center py-20 text-slate-500 text-sm font-medium">
                                        No {directoryView === 'Admin' ? 'Administrators' : 'Train Managers'} found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: SYSTEM AWARDS */}
            {activeTab === 'awards' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-6 px-6 sm:px-8">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div className="mb-2 lg:mb-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Award className="w-5 h-5 text-slate-500" />
                                        <CardTitle className="text-xl font-bold text-slate-900">System Awards</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium text-slate-500">
                                        Design and configure global recognition badges and engaging categories across the enterprise.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input 
                                            placeholder="Search awards..." 
                                            className="pl-9 h-10 bg-white border-slate-200 rounded-lg text-sm focus:border-[#0A1128]"
                                            value={awardSearch}
                                            onChange={(e) => setAwardSearch(e.target.value)}
                                        />
                                    </div>
                                    <Button 
                                        className="bg-[#0A1128] hover:bg-[#141E3C] text-white h-10 px-6 font-bold rounded-lg w-full sm:w-auto shadow-sm"
                                        onClick={() => { setEditingAward(null); setAwardForm({name:'', description:'', image:''}); setIsAwardModalOpen(true); }}
                                    >
                                        <Plus className="w-4 h-4 mr-2"/> New Award
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-3 px-6 sm:px-8 border-b border-slate-100">
                                <div className="col-span-4">Badge Title</div>
                                <div className="col-span-5">Criteria Description</div>
                                <div className="col-span-3 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredAwards.map((aw, index) => (
                                    <div key={`${aw.award_id}-${index}`} className="grid grid-cols-12 items-center px-6 sm:px-8 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <div className="col-span-4 font-semibold flex items-center gap-3 text-slate-900 pr-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-black/5 shadow-sm">
                                                <Award className="w-5 h-5 text-white" />
                                            </div>
                                            <span className="truncate text-base">{aw.award_name}</span>
                                        </div>
                                        <div className="col-span-5 text-sm text-slate-500 pr-6 line-clamp-2 font-medium">
                                            {aw.award_description}
                                        </div>
                                        <div className="col-span-3 text-sm text-slate-500 pr-6">
                                            {aw.award_image ? (
                                                <img src={aw.award_image} alt="Award" className="w-8 h-8 object-cover rounded-md border border-slate-200" />
                                            ) : (
                                                <span className="text-xs italic text-slate-400">No image</span>
                                            )}
                                        </div>
                                        <div className="col-span-3 text-right flex justify-end gap-2">
                                            <Button size="sm" className="h-9 px-4 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 border border-blue-100 font-bold rounded-lg shadow-sm" onClick={() => { setEditingAward(aw); setAwardForm({ name: aw.award_name, description: aw.award_description, image: aw.award_image }); setIsAwardModalOpen(true); }}>
                                                <Edit className="w-4 h-4 mr-1.5" /> Edit
                                            </Button>
                                            <Button size="sm" className="h-9 px-4 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border border-red-100 font-bold rounded-lg shadow-sm" onClick={() => handleDeleteAward(aw.award_id)}>
                                                <Trash2 className="w-4 h-4 mr-1.5" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {filteredAwards.length === 0 && (
                                    <div className="text-center py-20 text-slate-500 text-sm font-medium">
                                        No awards found.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>

      </div>

      {/* OVERLAY MODAL: CREATE/EDIT AWARD */}
      {isAwardModalOpen && (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border border-slate-200">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/80">
                 <div>
                     <h2 className="text-xl font-bold text-slate-900">{editingAward ? 'Edit Award' : 'Create Award'}</h2>
                     <p className="text-sm text-slate-500 mt-1 font-medium">Configure global recognition badges.</p>
                 </div>
                 <button onClick={() => setIsAwardModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors">
                     <X className="w-4 h-4" />
                 </button>
             </div>
             <form onSubmit={handleSaveAward} className="p-6 space-y-5">
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Badge Title</label>
                     <Input placeholder="e.g. Innovation Champion" value={awardForm.name} onChange={e => setAwardForm({...awardForm, name: e.target.value})} required className="h-12 border-slate-200 focus:border-[#0A1128] font-medium" />
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Criteria Description</label>
                     <Input placeholder="What is this award given for?" value={awardForm.description} onChange={e => setAwardForm({...awardForm, description: e.target.value})} required className="h-12 border-slate-200 focus:border-[#0A1128] font-medium" />
                 </div>
                 <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Badge Image URL</label>
                        <Input placeholder="Enter image URL for the badge" value={awardForm.image} onChange={e => setAwardForm({...awardForm, image: e.target.value})} className="h-12 border-slate-200 focus:border-[#0A1128] font-medium" />
                 </div>
                 <div className="pt-4">
                     <Button type="submit" className="w-full bg-[#0A1128] hover:bg-[#141E3C] h-12 text-md font-bold text-white rounded-xl shadow-md">
                         {editingAward ? 'Save Changes' : 'Publish Award'}
                     </Button>
                 </div>
             </form>
          </div>
       </div>
      )}

    </div>
  );
};

export default AdminDashboard;