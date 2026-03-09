import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, Loader2, X, UserCog, ShieldCheck, History, 
  FileText, Activity, Key, LogOut, CheckCircle2, Trophy, UserPlus 
} from "lucide-react";
import { toast } from "sonner";
import { employeeStorage, auth, nominationStorage, StoredUser } from "@/lib/localStorage";
import { Employee } from "@/types/employee";

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  employeeRecord: Employee | undefined;
  onUpdate: () => void;
}

export const ProfileSettings = ({ isOpen, onClose, currentUser, employeeRecord, onUpdate }: ProfileSettingsProps) => {
  const [activeTab, setActiveTab] = useState<'account' | 'log' | 'overview'>('account');
  const [isUploading, setIsUploading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Dynamic Data
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [stats, setStats] = useState({ sent: 0, received: 0, created: 0 });

  useEffect(() => {
    if (isOpen) {
      loadActivityData();
    }
  }, [isOpen, currentUser, employeeRecord]);

  const loadActivityData = () => {
      const logs: any[] = [];
      let sentCount = 0;
      let receivedCount = 0;
      let createdCount = 0;

      // 1. Fetch Nominations (Sent & Received)
      const allNoms = nominationStorage.getNominations();
      
      // Sent by me
      const sent = allNoms.filter(n => n.nominatorId === currentUser.id);
      sent.forEach(n => logs.push({
          id: n.id,
          type: 'sent',
          title: `Nominated Peer`,
          desc: `You recognized someone for ${n.awardType}`,
          date: n.timestamp
      }));
      sentCount = sent.length;

      // Received by me (if I am an employee)
      if (employeeRecord) {
          const received = allNoms.filter(n => n.nomineeId === employeeRecord.id);
          received.forEach(n => logs.push({
              id: n.id,
              type: 'received',
              title: `Award Received`,
              desc: `You won the ${n.awardType} award!`,
              date: n.timestamp
          }));
          receivedCount = received.length;
      }

      // 2. Fetch Created Users (For Admins & Managers)
      if (currentUser.role === 'admin' || currentUser.role === 'train-manager') {
          const createdUsers = auth.getUsersCreatedBy(currentUser.id);
          createdUsers.forEach(u => logs.push({
              id: u.id,
              type: 'created',
              title: `Team Member Added`,
              desc: `You added ${u.name} as ${u.role}`,
              date: u.createdAt || new Date().toISOString() // Fallback if old data misses date
          }));
          createdCount = createdUsers.length;
      }

      // Sort by newest first
      logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setActivityLog(logs);
      setStats({ sent: sentCount, received: receivedCount, created: createdCount });
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        toast.error("Image too large (Max 2MB)");
        return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const maxSize = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } } 
            else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
            
            if (employeeRecord) {
                employeeStorage.updateProfilePicture(employeeRecord.id, dataUrl);
                toast.success("Profile picture updated!");
                onUpdate();
            } else {
                toast.error("Only employees with profiles can change pictures.");
            }
            setIsUploading(false);
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPassword) return;
      const res = auth.changePassword(currentUser.id, newPassword);
      if (res.success) {
          toast.success("Password updated successfully");
          setNewPassword("");
      } else {
          toast.error("Failed to update password");
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[600px] overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
            
            {/* SIDEBAR NAVIGATION */}
            <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-6 flex flex-col gap-2">
                <div className="mb-6 flex items-center gap-2 text-slate-800 font-bold text-lg">
                    <UserCog className="w-5 h-5 text-indigo-600" /> Settings
                </div>
                
                <button 
                    onClick={() => setActiveTab('account')}
                    className={`text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'account' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <ShieldCheck className="w-4 h-4" /> Account Security
                </button>
                <button 
                    onClick={() => setActiveTab('log')}
                    className={`text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'log' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <History className="w-4 h-4" /> Activity Log
                </button>
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`text-sm font-medium px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <Activity className="w-4 h-4" /> My Overview
                </button>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 flex flex-col min-h-0 bg-white">
                <div className="p-4 border-b border-slate-100 flex justify-end">
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-2 rounded-full transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    
                    {/* TAB: ACCOUNT SECURITY */}
                    {activeTab === 'account' && (
                        <div className="space-y-8 max-w-md animate-in slide-in-from-right-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 mb-1">Account & Security</h3>
                                <p className="text-sm text-slate-500">Manage your login details and public profile.</p>
                            </div>

                            {/* Profile Picture Section (Only if user has employee record) */}
                            {employeeRecord ? (
                                <div className="flex items-center gap-6 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <Avatar className="w-20 h-20 border-4 border-white shadow-sm">
                                            <AvatarImage src={employeeRecord.profilePicture} className="object-cover" />
                                            <AvatarFallback className="text-2xl bg-indigo-50 text-indigo-600">{employeeRecord.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                            <Camera className="w-5 h-5" />
                                        </div>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-slate-900">{employeeRecord.name}</h4>
                                        <p className="text-xs text-slate-500 mb-2">{employeeRecord.jobTitle}</p>
                                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fileInputRef.current?.click()}>
                                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin mr-1"/> : "Upload New Photo"}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-100">
                                    Admin accounts do not have public profiles.
                                </div>
                            )}

                            {/* Password Section */}
                            <div className="pt-2">
                                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Key className="w-4 h-4 text-slate-400"/> Password Management
                                </h3>
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500 uppercase">New Password</label>
                                        <div className="flex gap-2">
                                            <Input 
                                                type="password" 
                                                placeholder="Enter new password" 
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="bg-slate-50"
                                            />
                                            <Button type="submit" disabled={!newPassword}>Save</Button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* TAB: ACTIVITY LOG (Unified Timeline) */}
                    {activeTab === 'log' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Activity Log</h3>
                                <p className="text-sm text-slate-500">A timeline of your recent actions and updates.</p>
                            </div>
                            
                            {activityLog.length === 0 ? (
                                <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-xl border border-dashed">
                                    No activity recorded yet.
                                </div>
                            ) : (
                                <div className="relative border-l border-slate-200 ml-3 space-y-6">
                                    {activityLog.map((log) => (
                                        <div key={log.id} className="ml-6 relative">
                                            <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                                log.type === 'sent' ? 'bg-blue-500' : 
                                                log.type === 'received' ? 'bg-green-500' : 'bg-purple-500'
                                            }`} />
                                            <div>
                                                <span className="text-xs text-slate-400 font-mono block mb-0.5">
                                                    {new Date(log.date).toLocaleDateString()} • {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                                <h4 className="text-sm font-bold text-slate-800">{log.title}</h4>
                                                <p className="text-sm text-slate-500">{log.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: OVERVIEW (Stats) */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                             <div>
                                <h3 className="text-xl font-bold text-slate-900">My Overview</h3>
                                <p className="text-sm text-slate-500">Summary of your contributions.</p>
                            </div>
                             
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Employee Stats */}
                                {employeeRecord && (
                                    <>
                                        <div className="p-5 rounded-xl bg-green-50 border border-green-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-green-700 font-medium">Awards Received</span>
                                                <Trophy className="w-5 h-5 text-green-600" />
                                            </div>
                                            <span className="text-3xl font-bold text-green-900">{stats.received}</span>
                                        </div>
                                        <div className="p-5 rounded-xl bg-blue-50 border border-blue-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-blue-700 font-medium">Nominations Given</span>
                                                <FileText className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <span className="text-3xl font-bold text-blue-900">{stats.sent}</span>
                                        </div>
                                    </>
                                )}

                                {/* Admin/Manager Stats */}
                                {(currentUser.role === 'admin' || currentUser.role === 'train-manager') && (
                                    <div className="p-5 rounded-xl bg-purple-50 border border-purple-100 col-span-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-purple-700 font-medium">Team Members Added</span>
                                            <UserPlus className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <span className="text-3xl font-bold text-purple-900">{stats.created}</span>
                                        <p className="text-xs text-purple-600 mt-2">Accounts created by you.</p>
                                    </div>
                                )}
                             </div>
                             
                             <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-900 mb-2">Role Permissions</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary" className="bg-white border-slate-200">Login Access</Badge>
                                    {employeeRecord && <Badge variant="secondary" className="bg-white border-slate-200">View Leaderboard</Badge>}
                                    {employeeRecord && <Badge variant="secondary" className="bg-white border-slate-200">Nominate Peers</Badge>}
                                    {currentUser.role === 'train-manager' && <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Manage Team</Badge>}
                                    {currentUser.role === 'admin' && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">System Admin</Badge>}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};