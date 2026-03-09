import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Shield, Check, X, Clock, Database, Briefcase, Award, LogOut, RefreshCw, Camera } from "lucide-react";
import { auth, adminActions, artManagerActions, StoredUser, STORAGE_KEYS, userActions, ART } from "@/lib/localStorage";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [pendingRequests, setPendingRequests] = useState<StoredUser[]>([]);
  const [allUsers, setAllUsers] = useState<StoredUser[]>([]);
  const [allArts, setAllArts] = useState<ART[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(() => {
    setPendingRequests(adminActions.getPendingRequests());
    setAllUsers(adminActions.getAllUsers());
    setAllArts(artManagerActions.getARTs());
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

  const handleApprove = (id: string) => {
    if(adminActions.approveUser(id)) {
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

  const registeredManagers = allUsers.filter(u => u.role === 'art-manager' && u.status !== 'pending');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 relative">
      
      <Badge variant="outline" className="absolute bottom-4 right-4 opacity-40 text-[9px] pointer-events-none">
          DB: {STORAGE_KEYS.USERS}
      </Badge>

      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* BEAUTIFUL WELCOME BANNER WITH PROMINENT PROFILE UPLOAD */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-violet-800 text-white shadow-xl shadow-purple-500/20">
            <div className="relative z-10 p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    
                    {/* ENHANCED PROFILE PICTURE UI */}
                    <div 
                        className="relative group cursor-pointer shrink-0" 
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload Profile Picture"
                    >
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold border-4 border-white/40 overflow-hidden shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:border-white/60">
                            {currentUser?.profilePicture ? (
                                <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                currentUser?.firstName?.charAt(0) || 'A'
                            )}
                        </div>
                        {/* Always-visible camera badge */}
                        <div className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg border-2 border-purple-600 text-purple-600 transition-transform duration-300 group-hover:scale-110 group-hover:bg-purple-50 group-hover:text-purple-700">
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
                        <h2 className="text-3xl font-bold mb-2">Welcome back, {currentUser?.firstName}! 👋</h2>
                        <p className="text-purple-100 text-lg max-w-xl">
                            Oversee system metrics, manage access requests, and control platform settings.
                        </p>
                    </div>
                </div>
                <Button variant="secondary" onClick={() => { auth.logout(); navigate("/"); }} className="bg-white/20 text-white hover:bg-white/30 border-0 backdrop-blur-md whitespace-nowrap mt-4 md:mt-0">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                </Button>
            </div>
        </section>

        {/* PENDING REQUESTS */}
        <Card className="border-purple-200 bg-purple-50/50 shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-center w-full">
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
                        <Clock className="w-5 h-5"/> Pending Access Requests ({pendingRequests.length})
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={() => { loadData(); toast.info("Data refreshed"); }} className="h-8 gap-2 bg-white text-purple-700 hover:bg-purple-50 border-purple-200">
                        <RefreshCw className="w-3.5 h-3.5" /> Force Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {pendingRequests.length === 0 ? <p className="text-sm text-purple-600 italic">No pending requests</p> :
                    pendingRequests.map(req => (
                        <div key={req.id} className="bg-white p-4 rounded-xl border border-purple-100 flex justify-between items-center shadow-sm hover:shadow-md transition-all">
                            <div>
                                <p className="font-bold text-slate-900">{req.firstName} {req.lastName}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={
                                        req.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        req.role === 'art-manager' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 
                                        'bg-slate-50 text-slate-700'
                                    }>
                                        {/* FIXED: Uniformly "ART Manager" */}
                                        {req.role === 'admin' ? 'Admin' : req.role === 'art-manager' ? 'ART Manager' : 'Employee'}
                                    </Badge>
                                    Requested: {new Date(req.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleReject(req.id)}><X className="w-4 h-4" /></Button>
                                <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700 shadow-sm" onClick={() => handleApprove(req.id)}><Check className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))
                }
            </CardContent>
        </Card>

        {/* ALL-TIME SYSTEM STATS (DUMMY DATA FOR BACKEND INTEGRATION) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <Users className="w-8 h-8 text-blue-500 mb-2" />
                    <h3 className="text-3xl font-bold text-slate-900">450</h3>
                    <p className="text-sm text-slate-500 font-medium">Total Users</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <Database className="w-8 h-8 text-indigo-500 mb-2" />
                    <h3 className="text-3xl font-bold text-slate-900">12</h3>
                    <p className="text-sm text-slate-500 font-medium">Total ARTs</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <Briefcase className="w-8 h-8 text-emerald-500 mb-2" />
                    <h3 className="text-3xl font-bold text-slate-900">48</h3>
                    <p className="text-sm text-slate-500 font-medium">Total Teams</p>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                    <Award className="w-8 h-8 text-amber-500 mb-2" />
                    <h3 className="text-3xl font-bold text-slate-900">1,204</h3>
                    <p className="text-sm text-slate-500 font-medium">All-Time Nominations</p>
                </CardContent>
            </Card>
        </div>

        {/* REGISTERED ART MANAGERS ONLY */}
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                    <Users className="w-5 h-5 text-purple-600"/> All Registered ART Managers
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <div className="grid grid-cols-12 text-xs font-bold text-slate-400 uppercase border-b pb-2 px-3">
                        <div className="col-span-4">Manager Name</div>
                        <div className="col-span-3">ART Name</div>
                        <div className="col-span-3">Department</div>
                        <div className="col-span-2 text-right">Status</div>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {registeredManagers.map(user => {
                            const managerArt = allArts.find(a => a.managerId === user.id);
                            
                            return (
                                <div key={user.id} className="grid grid-cols-12 items-center p-3 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                    <div className="col-span-4 font-semibold text-slate-900 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs shrink-0 overflow-hidden border border-indigo-200">
                                             {user.profilePicture ? (
                                                 <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                             ) : (
                                                 <span>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</span>
                                             )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span>{user.firstName} {user.lastName}</span>
                                            {user.createdBy === 'system_dummy' && <span className="text-[9px] text-slate-400 font-normal">Dummy Account</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-3 text-sm text-slate-600">
                                        {managerArt ? (
                                            <span className="font-medium text-indigo-700 truncate block pr-2">{managerArt.name}</span>
                                        ) : (
                                            <span className="text-slate-400 italic text-[11px]">Not created yet</span>
                                        )}
                                    </div>
                                    
                                    <div className="col-span-3 text-sm text-slate-600">
                                        {managerArt ? (
                                            <span className="truncate block pr-2">{managerArt.department}</span>
                                        ) : (
                                            <span className="text-slate-400 text-[11px]">-</span>
                                        )}
                                    </div>
                                    
                                    <div className="col-span-2 text-right flex justify-end">
                                        <Badge variant="outline" className={
                                            user.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                                            user.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                            'bg-amber-50 text-amber-700 border-amber-200'
                                        }>
                                            {user.status}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                        {registeredManagers.length === 0 && (
                            <div className="text-center py-6 text-slate-400 text-sm italic">
                                No registered ART Managers found.
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default AdminDashboard;