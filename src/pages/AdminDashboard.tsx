import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Users, Shield, Check, X, Clock, Database, Briefcase, Award, LogOut, RefreshCw, Camera, Plus, Edit, Trash2, LayoutDashboard, Search, ChevronRight, Zap, Crown } from "lucide-react";
import { auth, adminActions, artManagerActions, awardStorage, StoredUser, STORAGE_KEYS, userActions, ART, StoredAward } from "@/lib/localStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type DashboardTab = 'overview' | 'requests' | 'directory' | 'awards';
type DirectoryView = 'art-manager' | 'admin';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [directoryView, setDirectoryView] = useState<DirectoryView>('art-manager');
  
  const [pendingRequests, setPendingRequests] = useState<StoredUser[]>([]);
  const [allUsers, setAllUsers] = useState<StoredUser[]>([]);
  const [allArts, setAllArts] = useState<ART[]>([]);
  const [awards, setAwards] = useState<StoredAward[]>([]);

  // Search States
  const [directorySearch, setDirectorySearch] = useState("");
  const [awardSearch, setAwardSearch] = useState("");

  // Award Modal States
  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<StoredAward | null>(null);
  const [awardForm, setAwardForm] = useState({ type: '', description: '' });

  // Pending Art Manager details
  const [pendingArtDetails, setPendingArtDetails] = useState<Record<string, { artName: string, department: string }>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(() => {
    setPendingRequests(adminActions.getPendingRequests());
    setAllUsers(adminActions.getAllUsers());
    setAllArts(artManagerActions.getARTs());
    setAwards(awardStorage.getAwards());
  }, []);

  useEffect(() => {
    const user = auth.getCurrentUser('admin'); 
    if (!user || user.role !== 'admin') {
        navigate("/");
        return;
    }
    setCurrentUser(user);
    loadData();

    const handleStorageChange = () => {
        loadData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-update', handleStorageChange);
    
    const interval = setInterval(() => {
        loadData();
    }, 2000);

    return () => {
        clearInterval(interval);
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('local-storage-update', handleStorageChange);
    };
  }, [navigate, loadData]);

  const handleArtDetailChange = (id: string, field: 'artName' | 'department', value: string) => {
    setPendingArtDetails(prev => ({
        ...prev,
        [id]: { ...prev[id], [field]: value }
    }));
  };

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

  const handleSaveAward = (e: React.FormEvent) => {
      e.preventDefault();
      if (!awardForm.type.trim() || !awardForm.description.trim()) {
          toast.error("Please fill in both name and description.");
          return;
      }

      if (editingAward) {
          awardStorage.updateAward(editingAward.id, awardForm.type.trim(), awardForm.description.trim());
          toast.success("Award updated successfully!");
      } else {
          awardStorage.addAward(awardForm.type.trim(), awardForm.description.trim());
          toast.success("New award created!");
      }
      setIsAwardModalOpen(false);
      loadData();
  };

  const handleDeleteAward = (id: string) => {
      awardStorage.deleteAward(id);
      toast.success("Award deleted permanently.");
      loadData();
  };

  // Filtered lists for System Directory Toggle
  const registeredSystemUsers = allUsers.filter(u => u.status !== 'pending' && u.role === directoryView);
  
  const filteredDirectory = registeredSystemUsers.filter(u => 
      u.firstName.toLowerCase().includes(directorySearch.toLowerCase()) || 
      u.lastName.toLowerCase().includes(directorySearch.toLowerCase())
  );

  const filteredAwards = awards.filter(a => 
      a.type.toLowerCase().includes(awardSearch.toLowerCase()) || 
      a.description.toLowerCase().includes(awardSearch.toLowerCase())
  );

  return (
    <div 
        className="min-h-screen bg-[#f8fafc] pb-12 relative text-slate-900 overflow-hidden"
        style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {/* CSS Injection for Fonts and Anti-Gravity Animations */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&display=swap');
          
          .font-elegant { font-family: 'Playfair Display', serif; }
          
          @keyframes antigravity {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
          @keyframes antigravity-reverse {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(10px) rotate(2deg); }
          }
          
          .animate-float { animation: antigravity 6s ease-in-out infinite; }
          .animate-float-reverse { animation: antigravity-reverse 7s ease-in-out infinite; }
        `}
      </style>

      {/* Seamless Smooth Background Decorator */}
      <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-[#6141E8] via-[#6141E8]/60 to-[#f8fafc] z-0 pointer-events-none" />
      <div className="absolute top-[-50px] right-[10%] w-[500px] h-[500px] bg-[#8A6DFF] rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-float pointer-events-none" />
      <div className="absolute top-[50px] left-[5%] w-[400px] h-[400px] bg-[#4A2EC6] rounded-full mix-blend-multiply filter blur-[120px] opacity-50 animate-float-reverse pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 space-y-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl shadow-[#6141E8]/20 transition-all duration-500 hover:shadow-[#6141E8]/30 hover:border-white/30">
            <div className="flex items-center gap-6">
                <div 
                    className="relative group cursor-pointer shrink-0 animate-float" 
                    onClick={() => fileInputRef.current?.click()}
                    title="Upload Profile Picture"
                >
                    <div className="w-20 h-20 rounded-full bg-[#f4f2ff] flex items-center justify-center text-3xl font-bold text-[#6141E8] border-[3px] border-white/60 overflow-hidden shadow-xl transition-all duration-500 group-hover:scale-110 group-hover:border-white group-hover:shadow-2xl">
                        {currentUser?.profilePicture ? (
                            <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            currentUser?.firstName?.charAt(0) || 'A'
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-[#6141E8] p-2 rounded-full shadow-lg border-2 border-white text-white transition-all duration-500 group-hover:scale-125 group-hover:bg-[#4B32C3] group-hover:rotate-12">
                        <Camera className="w-3.5 h-3.5" />
                    </div>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <div>
                    <h2 className="text-3xl sm:text-5xl font-elegant font-bold text-white tracking-tight drop-shadow-md">Admin Console</h2>
                    <p className="text-white/90 text-sm mt-2 font-medium max-w-2xl leading-relaxed tracking-wide">
                        Welcome back, <span className="font-elegant italic text-lg">{currentUser?.firstName}</span>. Your central command center is ready. Oversee platform health, manage enterprise awards, and control access permissions.
                    </p>
                </div>
            </div>
            
            <div className="mt-8 md:mt-0 flex gap-3 shrink-0">
                <Button variant="outline" onClick={() => { loadData(); toast.info("System refreshed"); }} className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm h-12 px-6 rounded-xl transition-all duration-500 hover:scale-105">
                    <RefreshCw className="w-4 h-4 mr-2" /> Sync
                </Button>
                <Button variant="secondary" onClick={() => { auth.logout(); navigate("/"); }} className="bg-white text-[#6141E8] hover:bg-slate-50 shadow-xl h-12 px-8 font-bold rounded-xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
            </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex overflow-x-auto custom-scrollbar gap-2 bg-white/80 backdrop-blur-md p-2.5 rounded-2xl shadow-lg border border-[#6141E8]/10 max-w-fit mx-auto md:mx-0">
            <Button 
                variant={activeTab === 'overview' ? 'default' : 'ghost'} 
                className={`rounded-xl px-6 h-11 font-semibold transition-all duration-500 ${activeTab === 'overview' ? 'bg-[#6141E8] text-white shadow-lg scale-105' : 'text-slate-600 hover:bg-[#6141E8]/10 hover:text-[#6141E8]'}`}
                onClick={() => setActiveTab('overview')}
            >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Overview
            </Button>
            <Button 
                variant={activeTab === 'requests' ? 'default' : 'ghost'} 
                className={`rounded-xl px-6 h-11 font-semibold transition-all duration-500 ${activeTab === 'requests' ? 'bg-[#6141E8] text-white shadow-lg scale-105' : 'text-slate-600 hover:bg-[#6141E8]/10 hover:text-[#6141E8]'}`}
                onClick={() => setActiveTab('requests')}
            >
                <Clock className="w-4 h-4 mr-2" /> Access Requests
                {pendingRequests.length > 0 && (
                    <Badge className={`ml-2 px-1.5 py-0 h-5 border-0 transition-all duration-500 ${activeTab === 'requests' ? 'bg-white text-[#6141E8]' : 'bg-[#6141E8]/15 text-[#6141E8]'}`}>
                        {pendingRequests.length}
                    </Badge>
                )}
            </Button>
            <Button 
                variant={activeTab === 'directory' ? 'default' : 'ghost'} 
                className={`rounded-xl px-6 h-11 font-semibold transition-all duration-500 ${activeTab === 'directory' ? 'bg-[#6141E8] text-white shadow-lg scale-105' : 'text-slate-600 hover:bg-[#6141E8]/10 hover:text-[#6141E8]'}`}
                onClick={() => setActiveTab('directory')}
            >
                <Shield className="w-4 h-4 mr-2" /> System Directory
            </Button>
            <Button 
                variant={activeTab === 'awards' ? 'default' : 'ghost'} 
                className={`rounded-xl px-6 h-11 font-semibold transition-all duration-500 ${activeTab === 'awards' ? 'bg-[#6141E8] text-white shadow-lg scale-105' : 'text-slate-600 hover:bg-[#6141E8]/10 hover:text-[#6141E8]'}`}
                onClick={() => setActiveTab('awards')}
            >
                <Award className="w-4 h-4 mr-2" /> System Awards
            </Button>
        </div>

        {/* CONTENT AREA */}
        <div className="mt-4">
            
            {/* VIEW: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                    
                    {/* MAIN STATS GRID - WITH ANTI-GRAVITY HOVERS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card onClick={() => setActiveTab('requests')} className="border-0 shadow-lg ring-1 ring-slate-200/60 rounded-[1.5rem] bg-white/80 backdrop-blur-sm overflow-hidden relative group cursor-pointer transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-[#6141E8]/20 hover:bg-white">
                            <div className="absolute top-[-10px] right-[-10px] p-6 opacity-5 group-hover:opacity-10 transition-opacity animate-float">
                                <Clock className="w-32 h-32 text-[#6141E8]" />
                            </div>
                            <CardContent className="p-8 relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest group-hover:text-[#6141E8] transition-colors">Pending Requests</p>
                                </div>
                                <h3 className="text-5xl font-black text-slate-800 drop-shadow-sm">{pendingRequests.length}</h3>
                                <p className="text-sm text-slate-500 mt-2 font-medium">Managers awaiting approval.</p>
                            </CardContent>
                        </Card>

                        <Card onClick={() => setActiveTab('directory')} className="border-0 shadow-lg ring-1 ring-slate-200/60 rounded-[1.5rem] bg-white/80 backdrop-blur-sm overflow-hidden relative group cursor-pointer transition-all duration-500 hover:-translate-y-3 hover:shadow-2xl hover:shadow-[#6141E8]/20 hover:bg-white">
                            <div className="absolute top-[-10px] right-[-10px] p-6 opacity-5 group-hover:opacity-10 transition-opacity animate-float-reverse">
                                <Users className="w-32 h-32 text-[#6141E8]" />
                            </div>
                            <CardContent className="p-8 relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest group-hover:text-[#6141E8] transition-colors">Total Admin & Managers</p>
                                </div>
                                <h3 className="text-5xl font-black text-slate-800 drop-shadow-sm">{allUsers.filter(u => u.role === 'art-manager' && u.status === 'approved').length}</h3>
                                <p className="text-sm text-slate-500 mt-2 font-medium">Active registered Admin & ART Managers.</p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg ring-1 ring-slate-200/60 rounded-[1.5rem] bg-white/80 backdrop-blur-sm overflow-hidden relative group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:bg-white">
                            <div className="absolute top-[-10px] right-[-10px] p-6 opacity-5 group-hover:opacity-10 transition-opacity animate-float">
                                <Database className="w-32 h-32 text-[#6141E8]" />
                            </div>
                            <CardContent className="p-8 relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                                        <Database className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Employees</p>
                                </div>
                                <h3 className="text-5xl font-black text-slate-800 drop-shadow-sm">3,204</h3>
                                <p className="text-sm text-slate-500 mt-2 font-medium flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Synced up to date</p>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg ring-1 ring-slate-200/60 rounded-[1.5rem] bg-white/80 backdrop-blur-sm overflow-hidden relative group transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:bg-white">
                            <div className="absolute top-[-10px] right-[-10px] p-6 opacity-5 group-hover:opacity-10 transition-opacity animate-float-reverse">
                                <Award className="w-32 h-32 text-[#6141E8]" />
                            </div>
                            <CardContent className="p-8 relative z-10">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                                        <Award className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Nominations</p>
                                </div>
                                <h3 className="text-5xl font-black text-slate-800 drop-shadow-sm">1,204</h3>
                                <p className="text-sm text-slate-500 mt-2 font-medium flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Synced up to date</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ACTION REQUIRED PROMPT */}
                    {pendingRequests.length > 0 && (
                        <Card className="border-0 shadow-2xl ring-1 ring-white/30 rounded-[2rem] bg-gradient-to-r from-[#6141E8] via-[#4128A3] to-[#2B1B6D] text-white animate-in zoom-in-95 duration-700 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <CardContent className="p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="p-4 bg-white/10 rounded-3xl backdrop-blur-md shrink-0 shadow-inner animate-float border border-white/20">
                                        <Zap className="w-10 h-10 text-amber-300" />
                                    </div>
                                    <div>
                                        <h3 className="font-elegant font-bold text-3xl sm:text-4xl tracking-wide drop-shadow-sm">Action Required</h3>
                                        <p className="text-white/80 text-lg mt-2 font-medium tracking-wide">
                                            You have <strong>{pendingRequests.length}</strong> new access request(s) waiting for approval.
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    className="bg-white text-[#6141E8] hover:bg-slate-50 font-bold shadow-xl h-14 px-10 rounded-2xl shrink-0 w-full md:w-auto transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl text-lg"
                                    onClick={() => setActiveTab('requests')}
                                >
                                    Review Requests <ChevronRight className="w-6 h-6 ml-2" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* VIEW: ACCESS REQUESTS */}
            {activeTab === 'requests' && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                    <Card className="border-0 shadow-xl ring-1 ring-slate-200/60 rounded-[2rem] overflow-hidden bg-white/90 backdrop-blur-md">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-2xl font-elegant font-bold text-slate-900">Pending Approvals</CardTitle>
                                    <CardDescription className="text-base mt-2 font-medium">Review and assign new managers to the platform.</CardDescription>
                                </div>
                                {pendingRequests.length > 0 && (
                                    <Badge className="bg-[#6141E8]/10 text-[#6141E8] hover:bg-[#6141E8]/15 px-5 py-2 text-sm rounded-xl border-0 shadow-sm font-bold">
                                        {pendingRequests.length} Requires Action
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {pendingRequests.length === 0 ? (
                                <div className="py-40 flex flex-col items-center justify-center text-center bg-slate-50/30">
                                    <div className="w-28 h-28 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl border border-slate-100 animate-float">
                                        <Check className="w-14 h-14 text-emerald-400" />
                                    </div>
                                    <h4 className="text-3xl font-elegant font-bold text-slate-900">Inbox Zero!</h4>
                                    <p className="text-lg text-slate-500 mt-3 max-w-md font-medium">There are no pending access requests to review at this time. Excellent work!</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {pendingRequests.map(req => (
                                        <div key={req.id} className="p-8 px-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 hover:bg-slate-50 transition-all duration-500 group">
                                            
                                            {/* User Block */}
                                            <div className="flex items-center gap-5 min-w-[300px]">
                                                <div className="w-16 h-16 rounded-2xl bg-[#6141E8]/10 flex items-center justify-center text-[#6141E8] font-black text-2xl border border-[#6141E8]/20 shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:-rotate-3">
                                                    {req.firstName.charAt(0)}{req.lastName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-xl">{req.firstName} {req.lastName}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <Badge variant="outline" className={`font-bold px-3 py-1 border-0 shadow-sm ${req.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-[#6141E8]/10 text-[#6141E8]'}`}>
                                                            {req.role === 'admin' ? 'System Admin' : 'ART Manager'}
                                                        </Badge>
                                                        <span className="text-xs text-slate-400 font-semibold tracking-wide">
                                                            APPLIED: {new Date(req.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Helper text for context */}
                                            <div className="flex-1 flex items-center gap-3 text-base font-medium px-6 py-4 rounded-2xl border shadow-sm transition-all duration-500 group-hover:bg-white ${req.role === 'admin' ? 'bg-purple-50/50 text-purple-700 border-purple-100' : 'bg-[#6141E8]/5 text-[#6141E8] border-[#6141E8]/10'}">
                                                {req.role === 'admin' ? (
                                                    <><Shield className="w-6 h-6 animate-float" /> User is requesting full administrative system oversight.</>
                                                ) : (
                                                    <><Briefcase className="w-6 h-6 animate-float" /> User will configure their ART and Department upon first login.</>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-4 w-full xl:w-auto justify-end pt-4 xl:pt-0">
                                                <Button variant="outline" className="h-12 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 px-8 transition-all duration-300 font-bold rounded-xl" onClick={() => handleReject(req.id)}>
                                                    Deny
                                                </Button>
                                                <Button className="h-12 bg-[#6141E8] hover:bg-[#4B32C3] text-white shadow-lg px-10 font-bold rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[#6141E8]/30" onClick={() => handleApprove(req)}>
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

            {/* VIEW: SYSTEM DIRECTORY (ADMINS & MANAGERS TOGGLE) */}
            {activeTab === 'directory' && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                    <Card className="border-0 shadow-xl ring-1 ring-slate-200/60 rounded-[2rem] overflow-hidden bg-white/90 backdrop-blur-md">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
                            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                                <div>
                                    <CardTitle className="text-2xl font-elegant font-bold text-slate-900">System Directory</CardTitle>
                                    <CardDescription className="text-base mt-2 font-medium">Manage approved personnel and system access across the enterprise.</CardDescription>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full xl:w-auto">
                                    {/* Segmented Toggle Switch for Directory View */}
                                    <div className="bg-slate-200/50 p-1.5 rounded-2xl inline-flex w-full sm:w-auto shadow-inner">
                                        <button 
                                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${directoryView === 'art-manager' ? 'bg-white shadow-md text-[#6141E8] scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                            onClick={() => setDirectoryView('art-manager')}
                                        >
                                            ART Managers
                                        </button>
                                        <button 
                                            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${directoryView === 'admin' ? 'bg-white shadow-md text-[#6141E8] scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}
                                            onClick={() => setDirectoryView('admin')}
                                        >
                                            Administrators
                                        </button>
                                    </div>

                                    <div className="relative w-full sm:w-72">
                                        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input 
                                            placeholder="Search directory..." 
                                            className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm focus:border-[#6141E8] text-base transition-all duration-300 focus:ring-4 focus:ring-[#6141E8]/10"
                                            value={directorySearch}
                                            onChange={(e) => setDirectorySearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-5 px-10 border-b border-slate-200">
                                <div className="col-span-5 md:col-span-4">User Profile</div>
                                <div className="col-span-4 md:col-span-5">Role & Domain</div>
                                <div className="col-span-3 md:col-span-3 text-right">System Status</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredDirectory.map(user => {
                                    const managerArt = allArts.find(a => a.managerId === user.id);
                                    const isAdmin = user.role === 'admin';
                                    
                                    return (
                                        <div key={user.id} className="grid grid-cols-12 items-center px-10 py-6 border-b border-slate-50 hover:bg-slate-50/80 transition-all duration-300 group">
                                            <div className="col-span-5 md:col-span-4 font-semibold text-slate-900 flex items-center gap-5">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden border shadow-sm transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3 ${isAdmin ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-[#6141E8]/5 border-[#6141E8]/20 text-[#6141E8]'}`}>
                                                    {user.profilePicture ? (
                                                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="truncate pr-1 text-lg font-bold">{user.firstName} {user.lastName}</span>
                                                    {user.createdBy === 'system_dummy' && <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Test Account</span>}
                                                </div>
                                            </div>
                                            
                                            <div className="col-span-4 md:col-span-5 text-sm flex flex-col min-w-0 pr-4">
                                                {isAdmin ? (
                                                    <>
                                                        <span className="font-bold text-[#6141E8] flex items-center gap-2 text-base"><Crown className="w-5 h-5"/> System Administrator</span>
                                                        <span className="text-xs text-slate-500 mt-1 font-medium">Global System Access</span>
                                                    </>
                                                ) : managerArt ? (
                                                    <>
                                                      <span className="font-bold text-slate-800 flex items-center gap-2 text-base"><Briefcase className="w-5 h-5 text-[#6141E8]"/> {managerArt.name}</span>
                                                      <span className="text-xs text-slate-500 mt-1 font-medium truncate">ART Manager • {managerArt.department}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                      <span className="font-bold text-slate-800 flex items-center gap-2 text-base"><Briefcase className="w-5 h-5 text-slate-400"/> ART Manager</span>
                                                      <span className="text-xs text-slate-400 mt-1 font-medium italic">Awaiting ART Configuration</span>
                                                    </>
                                                )}
                                            </div>
                                            
                                            <div className="col-span-3 md:col-span-3 text-right flex justify-end items-center">
                                                <Badge variant="outline" className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border-0 shadow-sm transition-transform duration-300 group-hover:scale-105 ${
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
                                    <div className="text-center py-28 text-slate-400">
                                        <Users className="w-20 h-20 mx-auto mb-5 text-slate-200 animate-float" />
                                        <p className="text-xl text-slate-600 font-bold">No {directoryView === 'admin' ? 'Administrators' : 'ART Managers'} found.</p>
                                        <p className="mt-2 text-sm font-medium">Try adjusting your search criteria.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* VIEW: SYSTEM AWARDS */}
            {activeTab === 'awards' && (
                <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                    <Card className="border-0 shadow-xl ring-1 ring-slate-200/60 rounded-[2rem] overflow-hidden bg-white/90 backdrop-blur-md">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-8 px-10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <CardTitle className="text-2xl font-elegant font-bold text-slate-900">Award Configurations</CardTitle>
                                    <CardDescription className="text-base mt-2 font-medium">Design the global recognition badges available to all employees.</CardDescription>
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-5 w-full md:w-auto">
                                    <div className="relative w-full sm:w-80">
                                        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <Input 
                                            placeholder="Search awards..." 
                                            className="pl-12 h-12 bg-white border-slate-200 rounded-2xl shadow-sm w-full focus:border-[#6141E8] text-base transition-all duration-300 focus:ring-4 focus:ring-[#6141E8]/10"
                                            value={awardSearch}
                                            onChange={(e) => setAwardSearch(e.target.value)}
                                        />
                                    </div>
                                    <Button 
                                        className="bg-[#6141E8] hover:bg-[#4B32C3] text-white h-12 px-8 shadow-lg font-bold rounded-2xl w-full sm:w-auto transition-all duration-500 hover:-translate-y-1 hover:shadow-[#6141E8]/30"
                                        onClick={() => { setEditingAward(null); setAwardForm({type:'', description:''}); setIsAwardModalOpen(true); }}
                                    >
                                        <Plus className="w-5 h-5 mr-2"/> Create Award
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase tracking-widest bg-white py-5 px-10 border-b border-slate-200">
                                <div className="col-span-4">Badge Title</div>
                                <div className="col-span-6">Criteria Description</div>
                                <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredAwards.map(aw => (
                                    <div key={aw.id} className="grid grid-cols-12 items-center px-10 py-6 border-b border-slate-50 hover:bg-slate-50/80 transition-all duration-300 group">
                                        <div className="col-span-4 font-semibold flex items-center gap-5 text-slate-900 pr-4">
                                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md border border-black/5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" style={{ backgroundColor: aw.color }}>
                                                <Award className="w-7 h-7 text-white" />
                                            </div>
                                            <span className="truncate font-bold text-lg">{aw.type}</span>
                                        </div>
                                        <div className="col-span-6 text-sm text-slate-500 pr-6 line-clamp-2 leading-relaxed font-medium">
                                            {aw.description}
                                        </div>
                                        <div className="col-span-2 text-right flex justify-end gap-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                                            <Button size="icon" variant="ghost" className="h-12 w-12 text-slate-400 hover:text-[#6141E8] hover:bg-[#6141E8]/10 rounded-2xl" onClick={() => { setEditingAward(aw); setAwardForm({ type: aw.type, description: aw.description }); setIsAwardModalOpen(true); }}>
                                                <Edit className="w-5 h-5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-12 w-12 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl" onClick={() => handleDeleteAward(aw.id)}>
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {filteredAwards.length === 0 && (
                                    <div className="text-center py-28 text-slate-400">
                                        <Award className="w-20 h-20 mx-auto mb-5 text-slate-200 animate-float" />
                                        <p className="text-xl text-slate-600 font-bold">No awards found.</p>
                                        <p className="mt-2 text-sm font-medium">Try adjusting your search or create a new award.</p>
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
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100">
             <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-slate-50/80 relative">
                 <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#6141E8] to-[#8A6DFF]" />
                 <div>
                     <h2 className="text-3xl font-elegant font-bold text-slate-900">{editingAward ? 'Edit Award' : 'Create Award'}</h2>
                     <p className="text-sm text-slate-500 mt-2 font-medium">Design a new recognition badge for the platform.</p>
                 </div>
                 <button onClick={() => setIsAwardModalOpen(false)} className="text-slate-400 hover:text-slate-900 bg-white p-3 rounded-full shadow-sm border border-slate-200 transition-all duration-300 hover:scale-110">
                     <X className="w-5 h-5" />
                 </button>
             </div>
             <form onSubmit={handleSaveAward} className="p-8 space-y-6">
                 <div className="space-y-2.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Badge Title</label>
                     <Input placeholder="e.g. Innovation Champion" value={awardForm.type} onChange={e => setAwardForm({...awardForm, type: e.target.value})} required className="h-14 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#6141E8] focus:ring-4 focus:ring-[#6141E8]/10 transition-all text-base rounded-2xl font-semibold" />
                 </div>
                 <div className="space-y-2.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Criteria Description</label>
                     <Input placeholder="What is this award given for?" value={awardForm.description} onChange={e => setAwardForm({...awardForm, description: e.target.value})} required className="h-14 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#6141E8] focus:ring-4 focus:ring-[#6141E8]/10 transition-all text-base rounded-2xl font-semibold" />
                 </div>
                 <div className="pt-6">
                     <Button type="submit" className="w-full bg-gradient-to-r from-[#6141E8] to-[#4A2EC6] hover:from-[#4A2EC6] hover:to-[#2D1B73] mt-2 py-8 text-lg font-bold text-white shadow-xl shadow-[#6141E8]/20 rounded-2xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
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