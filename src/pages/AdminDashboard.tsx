import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { AdminActions, awardStorage, UserStorage } from "@/lib/ApiStorage";
import { AdminDashboardData, RegisteredARTManager, pendingArtManager, Award, STORAGE_KEYS, UserProfileData } from "@/data/models/Interfaces";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, UserCheck, ClipboardCheck, Trophy, Check, X, Plus, Pencil, Trash2, Users, Layers, Award as AwardIcon, Search, LogOut, ArrowLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const BASE_MEDIA_URL = "http://127.0.0.1:8000";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [adminProfile, setAdminProfile] = useState<UserProfileData | null>(null);
  const [registeredManagers, setRegisteredManagers] = useState<RegisteredARTManager[]>([]);
  const [pendingRequests, setPendingRequests] = useState<pendingArtManager[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);

  // Award CRUD state
  const [isCreatingAward, setIsCreatingAward] = useState(false);
  const [newAwardName, setNewAwardName] = useState("");
  const [newAwardDescription, setNewAwardDescription] = useState("");
  const [newAwardImage, setNewAwardImage] = useState<File | null>(null);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [editAwardName, setEditAwardName] = useState("");
  const [editAwardDescription, setEditAwardDescription] = useState("");
  const [editAwardImage, setEditAwardImage] = useState<File | null>(null);
  const [registeredManagerSearch, setRegisteredManagerSearch] = useState("");

  // User management state
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: 'deactivate' | 'activate' | 'delete' | null;
    userId: string | null;
    userName: string | null;
  }>({
    open: false,
    action: null,
    userId: null,
    userName: null
  });
  const loadData = useCallback(async () => {
    const dashboard = await AdminActions.getAdminDashboardData();
    if (dashboard) setDashboardData(dashboard);

    const profile = await UserStorage.getCurrentUserDetails();
    if (profile) setAdminProfile(profile);

    const managers = await AdminActions.getRegisteredARTManagers();
    setRegisteredManagers(managers);

    const pending = await AdminActions.getPendingARTManagersRequests();
    if (pending) setPendingRequests(Array.isArray(pending) ? pending : []);

    const loadedAwards = await awardStorage.getAwards();
    setAwards(loadedAwards);

    const allUsers = await AdminActions.getAllUsers();
    console.log("📥 Raw API response for users:", allUsers);

    // Normalize field names from API response
    const normalizedUsers = allUsers.map((user: any) => {
      console.log("📋 Processing user:", user);
      return {
        user_id: user.user_id || user.id || user.employee_id || user.userId,
        user_login: user.user_login || user.login || user.username || user.userName,
        user_firstname: user.user_firstname || user.first_name || user.firstName || user.employee_name?.split(' ')[0],
        user_lastname: user.user_lastname || user.last_name || user.lastName || user.employee_name?.split(' ')[1],
        user_role: user.user_role || user.employee_role || user.role,
        user_image: user.user_image || user.image,
        is_active: user.is_active !== undefined ? user.is_active : (user.status === 'Active' ? true : false),
        // Keep original fields too for reference
        ...user
      };
    });
    console.log("✅ Normalized users:", normalizedUsers);
    setUsers(normalizedUsers);
  }, []);

  const handlelogout = async () => {
    await UserStorage.logoutUser();
    navigate("/");
  };

  const handleConfirmAction = async () => {
    const { action, userId } = confirmDialog;

    console.log("🔍 handleConfirmAction called with:", { action, userId, dialogState: confirmDialog });

    if (!userId || !action) {
      console.error("❌ Missing userId or action, returning early");
      return;
    }

    const user = users.find(u => u.user_id === userId);
    if (!user) {
      console.error("❌ User not found in users list");
      return;
    }

    setDeletingUserId(userId);
    console.log("✅ Set deletingUserId to:", userId);

    try {
      if (action === 'deactivate') {
        // Deactivate: mark as inactive in DB using POST users/deactivate/ endpoint
        console.log(`🟡 Deactivating user ${userId}...`);
        const result = await UserStorage.deactivateUserProfile(userId);
        console.log(`✅ Deactivate response:`, result);
        if (result !== null && result !== undefined) {
          console.log("✅ Deactivate succeeded, updating UI");
          setUsers((prev) =>
            prev.map((u) =>
              u.user_id === userId ? { ...u, is_active: false, status: 'Inactive' } : u
            )
          );
          toast.success(`User ${user.user_login} deactivated successfully`);
        } else {
          console.error('❌ Deactivate failed: result is null or undefined');
          toast.error(`Failed to deactivate ${user.user_login}. Please try again.`);
        }
      } else if (action === 'activate') {
        // Activate: mark as active in DB using PUT users/ endpoint
        console.log(`🟡 Activating user ${userId}...`);
        const result = await UserStorage.activateUserProfile(userId);
        console.log(`✅ Activate response:`, result);
        if (result !== null && result !== undefined) {
          console.log("✅ Activate succeeded, updating UI");
          setUsers((prev) =>
            prev.map((u) =>
              u.user_id === userId ? { ...u, is_active: true, status: 'Active' } : u
            )
          );
          toast.success(`User ${user.user_login} activated successfully`);
        } else {
          console.error('❌ Activate failed: result is null or undefined');
          toast.error(`Failed to activate ${user.user_login}. Please try again.`);
        }
      } else if (action === 'delete') {
        // Delete: completely remove from DB using DELETE users/ endpoint
        console.log(`🟡 Deleting user ${userId}...`);
        const result = await UserStorage.deleteUserProfile(userId);
        console.log(`✅ Delete response:`, result);
        if (result !== null && result !== undefined) {
          console.log("✅ Delete succeeded, updating UI");
          setUsers((prev) => prev.filter((u) => u.user_id !== userId));
          toast.success(`User ${user.user_login} deleted successfully`);
        } else {
          console.error('❌ Delete failed: result is null or undefined');
          toast.error(`Failed to delete ${user.user_login}. Please try again.`);
        }
      }
    } finally {
      setDeletingUserId(null);
      setConfirmDialog({ open: false, action: null, userId: null, userName: null });
    }
  };

  useEffect(() => {
    const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE);
    if (userRole !== "Admin") {
      navigate("/");
      return;
    }
    loadData();
  }, [navigate, loadData]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' 
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white' 
      : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 text-slate-900'}`}>
      <div className={`${theme === 'dark' 
        ? 'bg-slate-800/80 border-slate-700' 
        : 'bg-white/80'} backdrop-blur border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} px-8 py-5 mb-6 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className={`${theme === 'dark' 
            ? 'text-slate-300 hover:text-white hover:bg-slate-700' 
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Admin Dashboard</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} mt-0.5`}>Manage users, awards, ART managers and organisation settings</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {adminProfile && (
            <div className="flex items-center gap-3">
              <img src={adminProfile.image ? BASE_MEDIA_URL + adminProfile.image : "/placeholder.svg"} alt={adminProfile.employee_name} className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-300" />
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{adminProfile.employee_name}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>Admin</p>
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={toggleTheme} className={`${theme === 'dark' 
            ? 'text-yellow-400 hover:text-yellow-300 hover:border-yellow-400 border-slate-600 bg-slate-700' 
            : 'text-slate-600 hover:text-amber-600 hover:border-amber-300'}`}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={async () => { await handlelogout(); }} className={`${theme === 'dark' 
            ? 'text-red-400 hover:text-red-300 hover:border-red-400 border-slate-600 bg-slate-700' 
            : 'text-slate-600 hover:text-red-600 hover:border-red-300'}`}>
            <LogOut className="h-4 w-4 mr-1" />Logout
          </Button>
        </div>
      </div>
      <div className="px-8 pb-8">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className={`w-full justify-center flex-wrap h-auto p-1.5 gap-1 ${theme === 'dark' ? 'bg-slate-800 border border-slate-700/40' : 'bg-slate-100'}`}>
            <TabsTrigger value="dashboard" className={`${theme === 'dark' ? 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-750/40' : 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-700 hover:bg-indigo-100'}`}><LayoutDashboard className="mr-2 h-4 w-4" />Admin Dashboard</TabsTrigger>
            <TabsTrigger value="registered-managers" className={`${theme === 'dark' ? 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-750/40' : 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-700 hover:bg-indigo-100'}`}><UserCheck className="mr-2 h-4 w-4" />Registered Train Managers</TabsTrigger>
            <TabsTrigger value="pending-requests" className={`${theme === 'dark' ? 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-750/40' : 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-700 hover:bg-indigo-100'}`}><ClipboardCheck className="mr-2 h-4 w-4" />Pending Art Manager Requests</TabsTrigger>
            <TabsTrigger value="manage-users" className={`${theme === 'dark' ? 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-750/40' : 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-700 hover:bg-indigo-100'}`}><Trash2 className="mr-2 h-4 w-4" />Manage Users</TabsTrigger>
            <TabsTrigger value="awards" className={`${theme === 'dark' ? 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-300 hover:text-white hover:bg-slate-750/40' : 'data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-700 hover:bg-indigo-100'}`}><Trophy className="mr-2 h-4 w-4" />Awards</TabsTrigger>
          </TabsList>

          {/* Tab 1: Admin Dashboard */}
          <TabsContent value="dashboard">
            <div className="p-6">
              {dashboardData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className={`transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white text-slate-800'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                      <Users className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{dashboardData.total_users}</div>
                    </CardContent>
                  </Card>
                  <Card className={`transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white text-slate-800'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total ARTs</CardTitle>
                      <Layers className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{dashboardData.total_arts}</div>
                    </CardContent>
                  </Card>
                  <Card className={`transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white text-slate-800'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                      <UserCheck className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{dashboardData.total_teams}</div>
                    </CardContent>
                  </Card>
                  <Card className={`transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white text-slate-800'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">All Time Nominations</CardTitle>
                      <AwardIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`} />
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{dashboardData.all_time_nominations}</div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <p className={theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}>Loading dashboard data...</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="registered-managers">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Registered Train Managers</h2>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ART, department, status..."
                    value={registeredManagerSearch}
                    onChange={(e) => setRegisteredManagerSearch(e.target.value)}
                    className={`pl-9 ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-indigo-500' : ''}`}
                  />
                </div>
              </div>
              <div className={`rounded-md border ${theme === 'dark' ? 'border-slate-750 bg-slate-800/40' : 'border-slate-200'}`}>
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-slate-800 hover:bg-slate-800' : ''}>
                    <TableRow className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-800/60' : ''}>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Name</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Login</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Role</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>ART Name</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Department</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredManagers
                      .filter((m) => {
                        if (!registeredManagerSearch) return true;
                        const q = registeredManagerSearch.toLowerCase();
                        return (
                          m.user_name.toLowerCase().includes(q) ||
                          m.art_name.toLowerCase().includes(q) ||
                          m.department.toLowerCase().includes(q) ||
                          m.status.toLowerCase().includes(q)
                        );
                      })
                      .map((manager) => (
                        <TableRow key={manager.user_id} className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-750/30' : ''}>
                          <TableCell className="font-medium">{manager.user_name}</TableCell>
                          <TableCell className={theme === 'dark' ? 'text-slate-300' : ''}>{manager.user_login}</TableCell>
                          <TableCell className={theme === 'dark' ? 'text-slate-300' : ''}>{manager.user_role}</TableCell>
                          <TableCell className={theme === 'dark' ? 'text-slate-300' : ''}>{manager.art_name}</TableCell>
                          <TableCell className={theme === 'dark' ? 'text-slate-300' : ''}>{manager.department}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              manager.status === 'Active' 
                                ? theme === 'dark' ? 'bg-green-950/60 text-green-300 border border-green-800' : 'bg-green-100 text-green-800' 
                                : theme === 'dark' ? 'bg-red-950/60 text-red-300 border border-red-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {manager.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    {registeredManagers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className={`text-center py-6 ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>
                          No registered train managers found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Pending Art Manager Requests */}
          <TabsContent value="pending-requests">
            <div className="p-4">
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Pending Art Manager Requests</h2>
              <div className={`rounded-md border ${theme === 'dark' ? 'border-slate-750 bg-slate-800/40' : 'border-slate-200'}`}>
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-slate-800 hover:bg-slate-800' : ''}>
                    <TableRow className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-800/60' : ''}>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Name</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Role</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Status</TableHead>
                      <TableHead className={`text-right ${theme === 'dark' ? 'text-slate-300' : ''}`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingRequests.map((req) => (
                      <TableRow key={req.user_id} className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-750/30' : ''}>
                        <TableCell className="font-medium">{req.user_name}</TableCell>
                        <TableCell className={theme === 'dark' ? 'text-slate-300' : ''}>{req.user_role}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            theme === 'dark' ? 'bg-yellow-950/60 text-yellow-300 border border-yellow-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {req.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={async () => {
                                const result = await AdminActions.updateARTManagerRequestStatus(req.user_id, "Approved");
                                if (result) {
                                  setPendingRequests((prev) => prev.filter((r) => r.user_id !== req.user_id));
                                  toast.success("Art manager request approved");
                                  const managers = await AdminActions.getRegisteredARTManagers();
                                  setRegisteredManagers(managers);
                                }
                              }}
                              className={`p-2 rounded-md transition-colors ${
                                theme === 'dark' ? 'hover:bg-green-950/40 text-green-400' : 'hover:bg-green-100 text-green-600'
                              }`}
                              title="Approve"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={async () => {
                                const result = await AdminActions.updateARTManagerRequestStatus(req.user_id, "Rejected");
                                if (result) {
                                  setPendingRequests((prev) => prev.filter((r) => r.user_id !== req.user_id));
                                  toast.success("Art manager request rejected");
                                }
                              }}
                              className={`p-2 rounded-md transition-colors ${
                                theme === 'dark' ? 'hover:bg-red-950/40 text-red-400' : 'hover:bg-red-100 text-red-600'
                              }`}
                              title="Reject"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className={`text-center py-6 ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>
                          No pending art manager requests.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Manage Users */}
          <TabsContent value="manage-users">
            <div className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Manage Employees</h2>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or login..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className={`pl-9 ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-indigo-500' : ''}`}
                  />
                </div>
              </div>
              <div className={`rounded-md border ${theme === 'dark' ? 'border-slate-750 bg-slate-800/40' : 'border-slate-200'}`}>
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-slate-800 hover:bg-slate-800' : ''}>
                    <TableRow className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-800/60' : ''}>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Image</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Login</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>First Name</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Last Name</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Employee Role</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Status</TableHead>
                      <TableHead className={`text-right ${theme === 'dark' ? 'text-slate-300' : ''}`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter((user) => {
                        // Show all users EXCEPT Admin and Art Manager/Train Manager
                        const excludedRoles = ["Admin", "Art Manager", "Train Manager"];
                        return !excludedRoles.includes(user.user_role);
                      })
                      .filter((user) =>
                        (user.user_login || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                        (user.user_firstname || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                        (user.user_lastname || '').toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((user) => (
                        <TableRow key={user.user_id} className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-750/30' : ''}>
                          <TableCell>
                            <img
                              src={user.user_image ? (user.user_image.startsWith('http') ? user.user_image : BASE_MEDIA_URL + user.user_image) : "/placeholder.svg"}
                              alt={user.user_login}
                              className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                              onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{user.user_login || 'N/A'}</TableCell>
                          <TableCell className={theme === 'dark' ? 'text-slate-300' : ''}>{user.user_firstname || '-'}</TableCell>
                          <TableCell className={theme === 'dark' ? 'text-slate-300' : ''}>{user.user_lastname || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={theme === 'dark' ? 'border-slate-650 text-slate-300 bg-slate-700/50' : ''}>{user.user_role || 'Employee'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${theme === 'dark' ? 'hover:bg-slate-700/50' : 'hover:bg-slate-100'}`} onClick={() => {
                              console.log("🔘 Switch area clicked for user:", user.user_id);
                              setConfirmDialog({
                                open: true,
                                action: user.is_active ? 'deactivate' : 'activate',
                                userId: user.user_id,
                                userName: user.user_login
                              });
                            }}>
                              <Switch
                                checked={user.is_active}
                                onCheckedChange={(checked) => {
                                  console.log("🔘 Switch toggled for user:", user.user_id, "to:", checked);
                                  setConfirmDialog({
                                    open: true,
                                    action: checked ? 'activate' : 'deactivate',
                                    userId: user.user_id,
                                    userName: user.user_login
                                  });
                                }}
                                className="cursor-pointer"
                              />
                              <span className="text-sm font-medium cursor-pointer select-none">
                                {user.is_active ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={() => {
                                console.log("🔘 Delete button clicked for user:", user.user_id);
                                setConfirmDialog({
                                  open: true,
                                  action: 'delete',
                                  userId: user.user_id,
                                  userName: user.user_login
                                });
                              }}
                              disabled={deletingUserId === user.user_id}
                              className={`p-2 rounded-md transition-colors disabled:opacity-50 ${
                                theme === 'dark' ? 'hover:bg-red-950/40 text-red-400' : 'hover:bg-red-100 text-red-600'
                              }`}
                              title="Delete user permanently"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    {users.filter((user) => !["Admin", "Art Manager", "Train Manager"].includes(user.user_role)).length === 0 && (
                      <TableRow key="no-employees">
                        <TableCell colSpan={7} className={`text-center py-6 ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>
                          No employees found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Awards */}
          <TabsContent value="awards">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Awards</h2>
                <Button
                  onClick={() => {
                    setIsCreatingAward(true);
                    setNewAwardName("");
                    setNewAwardDescription("");
                    setNewAwardImage(null);
                  }}
                  disabled={isCreatingAward}
                >
                  <Plus className="mr-2 h-4 w-4" />Create Award
                </Button>
              </div>
              <div className={`rounded-md border ${theme === 'dark' ? 'border-slate-750 bg-slate-800/40' : 'border-slate-200'}`}>
                <Table>
                  <TableHeader className={theme === 'dark' ? 'bg-slate-800 hover:bg-slate-800' : ''}>
                    <TableRow className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-800/60' : ''}>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Image</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Award Name</TableHead>
                      <TableHead className={theme === 'dark' ? 'text-slate-300' : ''}>Description</TableHead>
                      <TableHead className={`text-right ${theme === 'dark' ? 'text-slate-300' : ''}`}>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isCreatingAward && (
                      <TableRow key="creating-award" className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-750/30' : ''}>
                        <TableCell>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setNewAwardImage(e.target.files?.[0] ?? null)}
                            className={`text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs ${
                              theme === 'dark' 
                                ? 'text-slate-300 file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600' 
                                : 'text-slate-600 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200'
                            }`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Award name"
                            value={newAwardName}
                            onChange={(e) => setNewAwardName(e.target.value)}
                            className={theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-indigo-500' : ''}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Description"
                            value={newAwardDescription}
                            onChange={(e) => setNewAwardDescription(e.target.value)}
                            className={theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus-visible:ring-indigo-500' : ''}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={async () => {
                                const result = await awardStorage.addAward(newAwardName, newAwardDescription, newAwardImage);
                                if (result) {
                                  const updatedAwards = await awardStorage.getAwards();
                                  setAwards(updatedAwards);
                                  toast.success("Award created successfully");
                                }
                                setIsCreatingAward(false);
                              }}
                              className={`p-2 rounded-md transition-colors ${
                                theme === 'dark' ? 'hover:bg-green-950/40 text-green-400' : 'hover:bg-green-100 text-green-600'
                              }`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setIsCreatingAward(false)}
                              className={`p-2 rounded-md transition-colors ${
                                theme === 'dark' ? 'hover:bg-red-950/40 text-red-400' : 'hover:bg-red-100 text-red-650'
                              }`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    {awards.map((award) => (
                      <TableRow key={award.award_id} className={theme === 'dark' ? 'border-slate-750 hover:bg-slate-750/30' : ''}>
                        <TableCell>
                          {editingAwardId === award.award_id ? (
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setEditAwardImage(e.target.files?.[0] ?? null)}
                              className={`text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs ${
                                theme === 'dark' 
                                  ? 'text-slate-300 file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600' 
                                  : 'text-slate-600 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200'
                              }`}
                            />
                          ) : (
                            <img src={award.award_image ? BASE_MEDIA_URL + award.award_image : "/placeholder.svg"} alt={award.award_name} className="h-10 w-10 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {editingAwardId === award.award_id ? (
                            <Input value={editAwardName} onChange={(e) => setEditAwardName(e.target.value)} className={theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white focus-visible:ring-indigo-500' : ''} />
                          ) : (
                            award.award_name
                          )}
                        </TableCell>
                        <TableCell className={theme === 'dark' ? 'text-slate-300' : ''}>
                          {editingAwardId === award.award_id ? (
                            <Input value={editAwardDescription} onChange={(e) => setEditAwardDescription(e.target.value)} className={theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white focus-visible:ring-indigo-500' : ''} />
                          ) : (
                            award.award_description
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {editingAwardId === award.award_id ? (
                              <>
                                <button
                                  onClick={async () => {
                                    const result = await awardStorage.updateAward(award.award_id, editAwardName, editAwardDescription, editAwardImage);
                                    if (result) {
                                      const updatedAwards = await awardStorage.getAwards();
                                      setAwards(updatedAwards);
                                      toast.success("Award updated successfully");
                                    }
                                    setEditingAwardId(null);
                                  }}
                                  className={`p-2 rounded-md transition-colors ${
                                    theme === 'dark' ? 'hover:bg-green-950/40 text-green-400' : 'hover:bg-green-100 text-green-600'
                                  }`}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingAwardId(null)}
                                  className={`p-2 rounded-md transition-colors ${
                                    theme === 'dark' ? 'hover:bg-red-950/40 text-red-400' : 'hover:bg-red-100 text-red-650'
                                  }`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingAwardId(award.award_id);
                                    setEditAwardName(award.award_name);
                                    setEditAwardDescription(award.award_description);
                                    setEditAwardImage(null);
                                  }}
                                  className={`p-2 rounded-md transition-colors ${
                                    theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    const result = await awardStorage.deleteAward(award.award_id);
                                    if (result) {
                                      setAwards((prev) => prev.filter((a) => a.award_id !== award.award_id));
                                      toast.success("Award deleted successfully");
                                    }
                                  }}
                                  className={`p-2 rounded-md transition-colors ${
                                    theme === 'dark' ? 'hover:bg-red-950/40 text-red-400' : 'hover:bg-red-100 text-red-600'
                                  }`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {awards.length === 0 && !isCreatingAward && (
                      <TableRow key="no-awards">
                        <TableCell colSpan={4} className={`text-center py-6 ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>
                          No awards found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialog.open} onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ open: false, action: null, userId: null, userName: null });
          }
        }}>
          <DialogContent className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : ''}`}>
            <DialogHeader>
              <DialogTitle className={`${theme === 'dark' ? 'text-white' : ''}`}>
                {confirmDialog.action === 'activate' ? 'Activate User' : confirmDialog.action === 'deactivate' ? 'Deactivate User' : 'Delete User'}
              </DialogTitle>
              <DialogDescription className={`${theme === 'dark' ? 'text-slate-300' : ''}`}>
                {confirmDialog.action === 'activate'
                  ? `Are you sure you want to activate ${confirmDialog.userName}? They will be able to access the system again.`
                  : confirmDialog.action === 'deactivate'
                    ? `Are you sure you want to deactivate ${confirmDialog.userName}?`
                    : `Are you sure you want to permanently delete ${confirmDialog.userName}? This will remove all their data from the database and cannot be undone.`
                }
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmDialog({ open: false, action: null, userId: null, userName: null });
                }}
                type="button"
                className={theme === 'dark' ? 'border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 bg-slate-700' : ''}
              >
                Cancel
              </Button>
              <Button
                variant={confirmDialog.action === 'delete' ? 'destructive' : confirmDialog.action === 'activate' ? 'default' : 'default'}
                onClick={() => handleConfirmAction()}
                disabled={deletingUserId !== null}
                type="submit"
                className="min-w-24"
              >
                {deletingUserId ? 'Processing...' : confirmDialog.action === 'activate' ? 'Activate' : confirmDialog.action === 'deactivate' ? 'Deactivate' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;

