import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { AdminActions, awardStorage } from "@/lib/ApiStorage";
import { AdminDashboardData, RegisteredARTManager, pendingArtManager, Award, STORAGE_KEYS } from "@/data/models/Interfaces";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, UserCheck, ClipboardCheck, Trophy, Check, X, Plus, Pencil, Trash2, Users, Layers, Award as AwardIcon, Search, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const BASE_MEDIA_URL = "http://127.0.0.1:8000";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
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

  const loadData = useCallback(async () => {
    const dashboard = await AdminActions.getAdminDashboardData();
    if (dashboard) setDashboardData(dashboard);

    const managers = await AdminActions.getRegisteredARTManagers();
    setRegisteredManagers(managers);

    const pending = await AdminActions.getPendingARTManagersRequests();
    if (pending) setPendingRequests(Array.isArray(pending) ? pending : []);

    const loadedAwards = await awardStorage.getAwards();
    setAwards(loadedAwards);
  }, []);

  useEffect(() => {
    const userRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);
    if (userRole !== "Admin") {
      navigate("/");
      return;
    }
    loadData();
  }, [navigate, loadData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 px-8 py-5 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage users, awards, ART managers and organisation settings</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { localStorage.clear(); sessionStorage.clear(); navigate("/"); }} className="text-slate-600 hover:text-red-600 hover:border-red-300">
          <LogOut className="h-4 w-4 mr-1" />Logout
        </Button>
      </div>
      <div className="px-8 pb-8">
        <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full justify-center">
          <TabsTrigger value="dashboard"><LayoutDashboard className="mr-2 h-4 w-4" />Admin Dashboard</TabsTrigger>
          <TabsTrigger value="registered-managers"><UserCheck className="mr-2 h-4 w-4" />Registered Train Managers</TabsTrigger>
          <TabsTrigger value="pending-requests"><ClipboardCheck className="mr-2 h-4 w-4" />Pending Art Manager Requests</TabsTrigger>
          <TabsTrigger value="awards"><Trophy className="mr-2 h-4 w-4" />Awards</TabsTrigger>
        </TabsList>

        {/* Tab 1: Admin Dashboard */}
        <TabsContent value="dashboard">
          <div className="p-6">
            {dashboardData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.total_users}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total ARTs</CardTitle>
                    <Layers className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.total_arts}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.total_teams}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">All Time Nominations</CardTitle>
                    <AwardIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData.all_time_nominations}</div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-muted-foreground">Loading dashboard data...</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="registered-managers">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Registered Train Managers</h2>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ART, department, status..."
                  value={registeredManagerSearch}
                  onChange={(e) => setRegisteredManagerSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>ART Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
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
                  .map((manager, idx) => (
                  <TableRow key={`${manager.user_login}-${idx}`}>
                    <TableCell>{manager.user_name}</TableCell>
                    <TableCell>{manager.user_login}</TableCell>
                    <TableCell>{manager.user_role}</TableCell>
                    <TableCell>{manager.art_name}</TableCell>
                    <TableCell>{manager.department}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${manager.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {manager.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {registeredManagers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                      No registered train managers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 3: Pending Art Manager Requests */}
        <TabsContent value="pending-requests">
          <div className="p-4">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Pending Art Manager Requests</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((req) => (
                  <TableRow key={req.user_id}>
                    <TableCell>{req.user_name}</TableCell>
                    <TableCell>{req.user_role}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
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
                          className="p-2 rounded-md hover:bg-green-100 transition-colors"
                          title="Approve"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </button>
                        <button
                          onClick={async () => {
                            const result = await AdminActions.updateARTManagerRequestStatus(req.user_id, "Rejected");
                            if (result) {
                              setPendingRequests((prev) => prev.filter((r) => r.user_id !== req.user_id));
                              toast.success("Art manager request rejected");
                            }
                          }}
                          className="p-2 rounded-md hover:bg-red-100 transition-colors"
                          title="Reject"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {pendingRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No pending art manager requests.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 4: Awards */}
        <TabsContent value="awards">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Awards</h2>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Award Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isCreatingAward && (
                  <TableRow>
                    <TableCell>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setNewAwardImage(e.target.files?.[0] ?? null)}
                        className="text-sm text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Award name"
                        value={newAwardName}
                        onChange={(e) => setNewAwardName(e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Description"
                        value={newAwardDescription}
                        onChange={(e) => setNewAwardDescription(e.target.value)}
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
                          className="p-2 rounded-md hover:bg-green-100 transition-colors"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </button>
                        <button
                          onClick={() => setIsCreatingAward(false)}
                          className="p-2 rounded-md hover:bg-red-100 transition-colors"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {awards.map((award) => (
                  <TableRow key={award.award_id}>
                    <TableCell>
                      {editingAwardId === award.award_id ? (
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditAwardImage(e.target.files?.[0] ?? null)}
                          className="text-sm text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                        />
                      ) : (
                        <img src={award.award_image ? BASE_MEDIA_URL + award.award_image : "/placeholder.svg"} alt={award.award_name} className="h-10 w-10 rounded object-cover" />
                      )}
                    </TableCell>
                    <TableCell>
                      {editingAwardId === award.award_id ? (
                        <Input value={editAwardName} onChange={(e) => setEditAwardName(e.target.value)} />
                      ) : (
                        award.award_name
                      )}
                    </TableCell>
                    <TableCell>
                      {editingAwardId === award.award_id ? (
                        <Input value={editAwardDescription} onChange={(e) => setEditAwardDescription(e.target.value)} />
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
                              className="p-2 rounded-md hover:bg-green-100 transition-colors"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => setEditingAwardId(null)}
                              className="p-2 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <X className="h-4 w-4 text-red-600" />
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
                              className="p-2 rounded-md hover:bg-slate-100 transition-colors"
                            >
                              <Pencil className="h-4 w-4 text-slate-600" />
                            </button>
                            <button
                              onClick={async () => {
                                const result = await awardStorage.deleteAward(award.award_id);
                                if (result) {
                                  setAwards((prev) => prev.filter((a) => a.award_id !== award.award_id));
                                  toast.success("Award deleted successfully");
                                }
                              }}
                              className="p-2 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {awards.length === 0 && !isCreatingAward && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      No awards found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
