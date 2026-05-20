import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

import { sprintStorage, employeeStorage, artStorage, teamStorage, UserStorage } from "@/lib/ApiStorage";
import { ART, Team, Sprint, pendingArtEmployee, STORAGE_KEYS, MyArtEmployee, UserHomePageData } from "@/data/models/Interfaces";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Layers, Users, UserCheck, ClipboardCheck, CalendarRange, Pencil, Check, X, Plus, Trash2, ArrowUpDown, Search, CalendarIcon, Activity, Zap, Star, Building2, LogOut, ArrowLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";

//have create art option too

const BASE_URL = "http://127.0.0.1:8000";

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [myART, setMyART] = useState<ART | null>(null);
  const [pendingEmployeesRequests, setPendingEmployees] = useState<pendingArtEmployee[]>([]);
  const [allTeamsinMyART, setTeams] = useState<Team[]>([]);
  const [allSprints, setSprints] = useState<Sprint[]>([]);
  const [myARTEmployees, setMyARTEmployees] = useState<MyArtEmployee[]>([]);
  const [homePageData, setHomePageData] = useState<UserHomePageData | null>(null);
  const [isEditingArt, setIsEditingArt] = useState(false);
  const [editArtName, setEditArtName] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [isCreatingArt, setIsCreatingArt] = useState(false);
  const [newArtName, setNewArtName] = useState("");
  const [newArtDepartment, setNewArtDepartment] = useState("");
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [memberSortField, setMemberSortField] = useState<'team_name' | 'total_awards' | 'total_points' | 'active_status' | null>(null);
  const [memberSortDir, setMemberSortDir] = useState<'asc' | 'desc'>('asc');
  const [memberSearch, setMemberSearch] = useState("");
  const [sprintSortField, setSprintSortField] = useState<'year' | 'start_date' | 'end_date' | 'quater' | null>(null);
  const [sprintSortDir, setSprintSortDir] = useState<'asc' | 'desc'>('asc');

  // Sprint state
  const [isCreatingSprint, setIsCreatingSprint] = useState(false);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintYear, setNewSprintYear] = useState(String(new Date().getFullYear()));
  const [newSprintStartDate, setNewSprintStartDate] = useState<Date | undefined>(undefined);
  const [newSprintEndDate, setNewSprintEndDate] = useState<Date | undefined>(undefined);
  const [newSprintQuarter, setNewSprintQuarter] = useState<'1' | '2' | '3' | '4'>('1');
  const [newSprintStatus, setNewSprintStatus] = useState<'Planned' | 'Active' | 'Completed'>('Planned');
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [editSprintName, setEditSprintName] = useState("");
  const [editSprintYear, setEditSprintYear] = useState("");
  const [editSprintStartDate, setEditSprintStartDate] = useState<Date | undefined>(undefined);
  const [editSprintEndDate, setEditSprintEndDate] = useState<Date | undefined>(undefined);
  const [editSprintQuarter, setEditSprintQuarter] = useState<'1' | '2' | '3' | '4'>('1');
  const [editSprintStatus, setEditSprintStatus] = useState<'Planned' | 'Active' | 'Completed'>('Planned');

  //useCallback for loadData to prevent unnecessary re-renders
  const loadData = useCallback(async () => {
    const myArt = await artStorage.getMyART();
    if (!myArt) {
      console.error("getMyART returned nothing");
      return;
    }
    sessionStorage.setItem(STORAGE_KEYS.ART_ID, myArt.art_id);
    console.log("My ART:", myArt);
    setMyART(myArt);

    const pendingEmployees = await employeeStorage.getPendingEmployeesForArtManager(myArt.art_id);
    console.log("Pending Employees:", pendingEmployees);
    setPendingEmployees(pendingEmployees);

    const myArtTeams = await teamStorage.getTeams(myArt.art_id);
    console.log("My ART Teams:", myArtTeams);
    setTeams(myArtTeams);

    const loadedSprints = await sprintStorage.getSprints(myArt.art_id);
    console.log("Loaded Sprints:", loadedSprints);
    setSprints(loadedSprints);

    const myARTEmployees = await employeeStorage.getmyARTEmployees(myArt.art_id);
    console.log("My ART Employees:", myARTEmployees);
    setMyARTEmployees(myARTEmployees);

    const homeData = await employeeStorage.getUserHomePageData();
    if (homeData) setHomePageData(homeData);

  }, []);

  const handleLogout = async () => {
    await UserStorage.logoutUser();
    navigate("/");
  };

  useEffect(() => {
    const user_role = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE);

    if (user_role !== 'Art Manager') {
      navigate("/");
      return;
    }
    loadData();

    return () => {
    };
  }, [navigate, loadData]);


  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' 
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
      : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
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
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>RTM Dashboard</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} mt-0.5`}>Manage your ART, teams, sprints and approvals</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {myART?.art_manager_image && (
            <div className="flex items-center gap-2">
              <img src={BASE_URL + myART.art_manager_image} alt={myART.art_manager_name} className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-300" />
              <div className="text-right">
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{myART.art_manager_name}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'}`}>ART Manager</p>
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={toggleTheme} className={`${theme === 'dark' 
            ? 'text-yellow-400 hover:text-yellow-300 hover:border-yellow-400 border-slate-600 bg-slate-700' 
            : 'text-slate-600 hover:text-amber-600 hover:border-amber-300'}`}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={async () => { await handleLogout(); }} className={`${theme === 'dark' 
            ? 'text-red-400 hover:text-red-300 hover:border-red-400 border-slate-600 bg-slate-700' 
            : 'text-slate-600 hover:text-red-600 hover:border-red-300'}`}>
            <LogOut className="h-4 w-4 mr-1" />Logout
          </Button>
        </div>
      </div>
      <div className="px-8 pb-8">
        <Tabs defaultValue="art" className="w-full">
          <TabsList className="w-full justify-center">
            <TabsTrigger value="art"><Layers className="mr-2 h-4 w-4" />ART</TabsTrigger>
            <TabsTrigger value="teams"><Users className="mr-2 h-4 w-4" />Teams</TabsTrigger>
            <TabsTrigger value="team-members"><UserCheck className="mr-2 h-4 w-4" />Team Members</TabsTrigger>
            <TabsTrigger value="pending-approvals"><ClipboardCheck className="mr-2 h-4 w-4" />Pending Approvals</TabsTrigger>
            <TabsTrigger value="sprints"><CalendarRange className="mr-2 h-4 w-4" />Sprints</TabsTrigger>
          </TabsList>

          <TabsContent value="art">
            <div className="p-6 space-y-8">
              {/* ART Details */}
              <div className="flex justify-center">
                {myART ? (
                  <Card className="w-full max-w-2xl">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>ART Details</CardTitle>
                      <div className="flex gap-2">
                        {!isEditingArt ? (
                          <>
                            <button
                              onClick={() => {
                                setEditArtName(myART.art_name);
                                setEditDepartment(myART.department);
                                setIsEditingArt(true);
                              }}
                              className="p-2 rounded-md hover:bg-slate-100 transition-colors"
                            >
                              <Pencil className="h-4 w-4 text-slate-600" />
                            </button>
                            <button
                              onClick={async () => {
                                const result = await artStorage.deleteMyArt(myART.art_id);
                                if (result) {
                                  setMyART(null);
                                  toast.success("ART deleted successfully");
                                }
                              }}
                              className="p-2 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={async () => {
                                const result = await artStorage.updateMyArt(myART.art_id, editArtName, editDepartment);
                                if (result) {
                                  setMyART({ ...myART, art_name: editArtName, department: editDepartment });
                                  toast.success("ART updated successfully");
                                }
                                setIsEditingArt(false);
                              }}
                              className="p-2 rounded-md hover:bg-green-100 transition-colors"
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => setIsEditingArt(false)}
                              className="p-2 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </button>
                          </>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">ART Name</p>
                        {isEditingArt ? (
                          <Input value={editArtName} onChange={(e) => setEditArtName(e.target.value)} />
                        ) : (
                          <p className="font-medium text-slate-800 dark:text-slate-200">{myART.art_name}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Department</p>
                        {isEditingArt ? (
                          <Input value={editDepartment} onChange={(e) => setEditDepartment(e.target.value)} />
                        ) : (
                          <p className="font-medium text-slate-800 dark:text-slate-200">{myART.department}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Created At</p>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(myART.created_at).toLocaleDateString()}</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : isCreatingArt ? (
                  <Card className="w-full max-w-2xl">
                    <CardHeader>
                      <CardTitle>Create New ART</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">ART Name</p>
                        <Input
                          placeholder="Enter ART name"
                          value={newArtName}
                          onChange={(e) => setNewArtName(e.target.value)}
                        />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Department</p>
                        <Input
                          placeholder="Enter department"
                          value={newArtDepartment}
                          onChange={(e) => setNewArtDepartment(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreatingArt(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            const result = await artStorage.createMyArt(newArtName, newArtDepartment);
                            if (result) {
                              const freshART = await artStorage.getMyART();
                              if (freshART) {
                                setMyART(freshART);
                                sessionStorage.setItem(STORAGE_KEYS.ART_ID, freshART.art_id);
                              }
                              toast.success("ART created successfully");
                            }
                            setIsCreatingArt(false);
                            setNewArtName("");
                            setNewArtDepartment("");
                          }}
                        >
                          Create
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">No ART found. Create one to get started.</p>
                    <Button onClick={() => setIsCreatingArt(true)}>
                      <Plus className="mr-2 h-4 w-4" />Create ART
                    </Button>
                  </div>
                )}
              </div>

              {/* Organisation Pulse */}
              {homePageData && (
                <div className="mt-8 space-y-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500" />Organisation Pulse</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-800/80">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><Zap className="h-6 w-6 text-blue-600" /></div>
                        <div>
                          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{homePageData.total_nominations_done_in_last_day}</p>
                          <p className="text-sm text-muted-foreground">Nominations in Last 24h</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm bg-white dark:bg-slate-800/80">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><UserCheck className="h-6 w-6 text-green-600" /></div>
                        <div>
                          <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{homePageData.total_active_Employees}</p>
                          <p className="text-sm text-muted-foreground">Active Employees</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className={`border-0 shadow-md ${theme === 'dark'
                      ? 'bg-gradient-to-b from-yellow-900/30 to-slate-700 border-yellow-700/30'
                      : 'bg-gradient-to-b from-yellow-50 to-white'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-base flex items-center gap-2 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-700'}`}><Star className="h-4 w-4" />Last Sprint — ART Top 5</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {homePageData.last_sprint_top5_champions_in_your_art.length > 0
                          ? homePageData.last_sprint_top5_champions_in_your_art.map((c, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl backdrop-blur border transition-all ${
                              theme === 'dark'
                                ? 'bg-slate-600/30 border-slate-500/30 hover:bg-slate-600/40'
                                : 'bg-white/60 border-white/40 hover:bg-white/80'
                            } shadow-sm hover:shadow-md`}>
                              <img src={c.employee_image ? BASE_URL + c.employee_image : "/placeholder.svg"} alt={c.employee_name} className="h-10 w-10 rounded-full object-cover ring-2 ring-yellow-300" />
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-sm truncate`}>{c.employee_name}</p>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} truncate`}>{c.most_received_award_name}</p>
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                                theme === 'dark'
                                  ? 'bg-yellow-900/40 text-yellow-300'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}><Star className="h-3 w-3" />{c.no_of_nominations_received}</div>
                            </div>
                          ))
                          : <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} text-center py-4`}>No data yet</p>
                        }
                      </CardContent>
                    </Card>
                    <Card className={`border-0 shadow-md ${theme === 'dark'
                      ? 'bg-gradient-to-b from-indigo-900/30 to-slate-700 border-indigo-700/30'
                      : 'bg-gradient-to-b from-indigo-50 to-white'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-base flex items-center gap-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-700'}`}><Star className="h-4 w-4" />ART Level — All Time Top 5</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {homePageData.art_level_champions_top5.length > 0
                          ? homePageData.art_level_champions_top5.map((c, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl backdrop-blur border transition-all ${
                              theme === 'dark'
                                ? 'bg-slate-600/30 border-slate-500/30 hover:bg-slate-600/40'
                                : 'bg-white/60 border-white/40 hover:bg-white/80'
                            } shadow-sm hover:shadow-md`}>
                              <img src={c.employee_image ? BASE_URL + c.employee_image : "/placeholder.svg"} alt={c.employee_name} className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-300" />
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-sm truncate`}>{c.employee_name}</p>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} truncate`}>{c.most_received_award_name}</p>
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                                theme === 'dark'
                                  ? 'bg-indigo-900/40 text-indigo-300'
                                  : 'bg-indigo-100 text-indigo-700'
                              }`}><Star className="h-3 w-3" />{c.no_of_nominations_received}</div>
                            </div>
                          ))
                          : <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} text-center py-4`}>No data yet</p>
                        }
                      </CardContent>
                    </Card>
                    <Card className={`border-0 shadow-md ${theme === 'dark'
                      ? 'bg-gradient-to-b from-emerald-900/30 to-slate-700 border-emerald-700/30'
                      : 'bg-gradient-to-b from-emerald-50 to-white'}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className={`text-base flex items-center gap-2 ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-700'}`}><Building2 className="h-4 w-4" />Organisation — All Time Top 5</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {homePageData.organization_level_champions_top5_till_now.length > 0
                          ? homePageData.organization_level_champions_top5_till_now.map((c, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl backdrop-blur border transition-all ${
                              theme === 'dark'
                                ? 'bg-slate-600/30 border-slate-500/30 hover:bg-slate-600/40'
                                : 'bg-white/60 border-white/40 hover:bg-white/80'
                            } shadow-sm hover:shadow-md`}>
                              <img src={c.employee_image ? BASE_URL + c.employee_image : "/placeholder.svg"} alt={c.employee_name} className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-300" />
                              <div className="flex-1 min-w-0">
                                <p className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'} text-sm truncate`}>{c.employee_name}</p>
                                <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} truncate`}>{c.team_name} · {c.art_name} · {c.most_received_award_name}</p>
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                                theme === 'dark'
                                  ? 'bg-emerald-900/40 text-emerald-300'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}><Star className="h-3 w-3" />{c.no_of_nominations_received}</div>
                            </div>
                          ))
                          : <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} text-center py-4`}>No data yet</p>
                        }
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="teams">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Teams</h2>
                <Button
                  onClick={() => {
                    setIsCreatingTeam(true);
                    setNewTeamName("");
                    setNewTeamDescription("");
                  }}
                  disabled={isCreatingTeam}
                >
                  <Plus className="mr-2 h-4 w-4" />Create Team
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCreatingTeam && (
                    <TableRow>
                      <TableCell>
                        <Input
                          placeholder="Team name"
                          value={newTeamName}
                          onChange={(e) => setNewTeamName(e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Description"
                          value={newTeamDescription}
                          onChange={(e) => setNewTeamDescription(e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={async () => {
                              const artId = sessionStorage.getItem(STORAGE_KEYS.ART_ID);
                              if (!artId) return;
                              const result = await teamStorage.createTeam(newTeamName, newTeamDescription, artId);
                              if (result) {
                                const updatedTeams = await teamStorage.getTeams(artId);
                                setTeams(updatedTeams);
                                toast.success("Team created successfully");
                              }
                              setIsCreatingTeam(false);
                            }}
                            className="p-2 rounded-md hover:bg-green-100 transition-colors"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => setIsCreatingTeam(false)}
                            className="p-2 rounded-md hover:bg-red-100 transition-colors"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {allTeamsinMyART.map((team) => (
                    <TableRow key={team.team_id}>
                      <TableCell>
                        {editingTeamId === team.team_id ? (
                          <Input value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} />
                        ) : (
                          team.team_name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingTeamId === team.team_id ? (
                          <Input value={editTeamDescription} onChange={(e) => setEditTeamDescription(e.target.value)} />
                        ) : (
                          team.team_description
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {editingTeamId === team.team_id ? (
                            <>
                              <button
                                onClick={async () => {
                                  const artId = sessionStorage.getItem(STORAGE_KEYS.ART_ID);
                                  if (!artId) return;
                                  const result = await teamStorage.updateTeam(team.team_id, editTeamName, editTeamDescription, artId);
                                  if (result) {
                                    setTeams((prev) =>
                                      prev.map((t) => t.team_id === team.team_id ? { ...t, team_name: editTeamName, team_description: editTeamDescription } : t)
                                    );
                                    toast.success("Team updated successfully");
                                  }
                                  setEditingTeamId(null);
                                }}
                                className="p-2 rounded-md hover:bg-green-100 transition-colors"
                              >
                                <Check className="h-4 w-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => setEditingTeamId(null)}
                                className="p-2 rounded-md hover:bg-red-100 transition-colors"
                              >
                                <X className="h-4 w-4 text-red-600" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingTeamId(team.team_id);
                                  setEditTeamName(team.team_name);
                                  setEditTeamDescription(team.team_description);
                                }}
                                className="p-2 rounded-md hover:bg-slate-100 transition-colors"
                              >
                                <Pencil className="h-4 w-4 text-slate-600" />
                              </button>
                              <button
                                onClick={async () => {
                                  const result = await teamStorage.deleteTeam(team.team_id);
                                  if (result) {
                                    setTeams((prev) => prev.filter((t) => t.team_id !== team.team_id));
                                    toast.success("Team deleted successfully");
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
                  {allTeamsinMyART.length === 0 && !isCreatingTeam && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        No teams found. Create one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="team-members">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Team Members</h2>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, team, or role..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        if (memberSortField === 'team_name') {
                          setMemberSortDir(memberSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setMemberSortField('team_name');
                          setMemberSortDir('asc');
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">Team <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        if (memberSortField === 'active_status') {
                          setMemberSortDir(memberSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setMemberSortField('active_status');
                          setMemberSortDir('asc');
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        if (memberSortField === 'total_awards') {
                          setMemberSortDir(memberSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setMemberSortField('total_awards');
                          setMemberSortDir('asc');
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">Awards <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        if (memberSortField === 'total_points') {
                          setMemberSortDir(memberSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setMemberSortField('total_points');
                          setMemberSortDir('asc');
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">Points <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...myARTEmployees]
                    .filter((emp) => {
                      if (!memberSearch) return true;
                      const q = memberSearch.toLowerCase();
                      return emp.employee_name.toLowerCase().includes(q) ||
                        emp.team_name.toLowerCase().includes(q) ||
                        emp.employee_role.toLowerCase().includes(q);
                    })
                    .sort((a, b) => {
                      if (!memberSortField) return 0;
                      const valA = a[memberSortField];
                      const valB = b[memberSortField];
                      if (typeof valA === 'string' && typeof valB === 'string') {
                        return memberSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                      }
                      return memberSortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
                    })
                    .map((emp) => (
                      <TableRow key={emp.employee_id}>
                        <TableCell>{emp.employee_name}</TableCell>
                        <TableCell>{emp.employee_role}</TableCell>
                        <TableCell>{emp.team_name}</TableCell>
                        <TableCell>
                          <img src={emp.image ? BASE_URL + emp.image : "/placeholder.svg"} alt={emp.employee_name} className="h-8 w-8 rounded-full object-cover" />
                        </TableCell>
                        <TableCell>{emp.active_status}</TableCell>
                        <TableCell>{emp.total_awards}</TableCell>
                        <TableCell>{emp.total_points}</TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={async () => {
                              const team = allTeamsinMyART.find((t) => t.team_name === emp.team_name);
                              if (!team) return;
                              const result = await employeeStorage.removeEmployeeFromTeam(emp.employee_id, team.team_id);
                              if (result) {
                                setMyARTEmployees((prev) => prev.filter((e) => e.employee_id !== emp.employee_id));
                                toast.success("Employee removed from team");
                              }
                            }}
                            className="p-2 rounded-md hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {myARTEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                        No team members found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="pending-approvals">
            <div className="p-4">
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-4">Pending Approvals</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingEmployeesRequests.map((emp, idx) => (
                    <TableRow key={`${emp.employee_id}-${idx}`}>
                      <TableCell>
                        <img src={emp.image ? BASE_URL + emp.image : "/placeholder.svg"} alt={emp.employee_name} className="h-8 w-8 rounded-full object-cover" />
                      </TableCell>
                      <TableCell>{emp.employee_name}</TableCell>
                      <TableCell>{emp.team_name}</TableCell>
                      <TableCell>{emp.employee_role}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={async () => {
                              const result = await employeeStorage.updateEmployeeTeamApprovalStatus(emp.employee_id, emp.team_id, 1);
                              if (result) {
                                setPendingEmployees((prev) => prev.filter((e) => e.employee_id !== emp.employee_id));
                                toast.success("Employee approved");
                                const refreshARTemployees = await employeeStorage.getmyARTEmployees(sessionStorage.getItem(STORAGE_KEYS.ART_ID) || "");
                                setMyARTEmployees(refreshARTemployees);

                              }
                            }}
                            className="p-2 rounded-md hover:bg-green-100 transition-colors"
                            title="Approve"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </button>
                          <button
                            onClick={async () => {
                              const result = await employeeStorage.updateEmployeeTeamApprovalStatus(emp.employee_id, emp.team_id, 0);
                              if (result) {
                                setPendingEmployees((prev) => prev.filter((e) => e.employee_id !== emp.employee_id));
                                toast.success("Employee rejected");
                                const refreshARTemployees = await employeeStorage.getmyARTEmployees(sessionStorage.getItem(STORAGE_KEYS.ART_ID) || "");
                                setMyARTEmployees(refreshARTemployees);
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
                  {pendingEmployeesRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        No pending approvals.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="sprints">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Sprints</h2>
                <Button
                  onClick={() => {
                    setIsCreatingSprint(true);
                    setNewSprintName("");
                    setNewSprintYear(String(new Date().getFullYear()));
                    setNewSprintStartDate(undefined);
                    setNewSprintEndDate(undefined);
                    setNewSprintQuarter('1');
                    setNewSprintStatus('Planned');
                  }}
                  disabled={isCreatingSprint}
                >
                  <Plus className="mr-2 h-4 w-4" />Create Sprint
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sprint Name</TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        if (sprintSortField === 'year') { setSprintSortDir(sprintSortDir === 'asc' ? 'desc' : 'asc'); }
                        else { setSprintSortField('year'); setSprintSortDir('asc'); }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">Year <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        if (sprintSortField === 'start_date') { setSprintSortDir(sprintSortDir === 'asc' ? 'desc' : 'asc'); }
                        else { setSprintSortField('start_date'); setSprintSortDir('asc'); }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">Start Date <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        if (sprintSortField === 'end_date') { setSprintSortDir(sprintSortDir === 'asc' ? 'desc' : 'asc'); }
                        else { setSprintSortField('end_date'); setSprintSortDir('asc'); }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">End Date <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => {
                        if (sprintSortField === 'quater') { setSprintSortDir(sprintSortDir === 'asc' ? 'desc' : 'asc'); }
                        else { setSprintSortField('quater'); setSprintSortDir('asc'); }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">Quarter <ArrowUpDown className="h-3 w-3" /></span>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCreatingSprint && (
                    <TableRow>
                      <TableCell>
                        <Input
                          placeholder="Sprint name"
                          value={newSprintName}
                          onChange={(e) => setNewSprintName(e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={newSprintYear} onValueChange={(v) => { setNewSprintYear(v); setNewSprintStartDate(undefined); setNewSprintEndDate(undefined); }}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={String(new Date().getFullYear())}>{new Date().getFullYear()}</SelectItem>
                            <SelectItem value={String(new Date().getFullYear() + 1)}>{new Date().getFullYear() + 1}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[130px] justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newSprintStartDate ? format(newSprintStartDate, "yyyy-MM-dd") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newSprintStartDate}
                              onSelect={setNewSprintStartDate}
                              defaultMonth={new Date(Number(newSprintYear), 0)}
                              fromDate={new Date(Number(newSprintYear), 0, 1)}
                              toDate={newSprintEndDate || new Date(Number(newSprintYear), 11, 31)}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[130px] justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newSprintEndDate ? format(newSprintEndDate, "yyyy-MM-dd") : "Pick date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newSprintEndDate}
                              onSelect={setNewSprintEndDate}
                              defaultMonth={newSprintStartDate || new Date(Number(newSprintYear), 0)}
                              fromDate={newSprintStartDate || new Date(Number(newSprintYear), 0, 1)}
                              toDate={new Date(Number(newSprintYear), 11, 31)}
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell>
                        <Select value={newSprintQuarter} onValueChange={(v) => setNewSprintQuarter(v as '1' | '2' | '3' | '4')}>
                          <SelectTrigger className="w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Q1</SelectItem>
                            <SelectItem value="2">Q2</SelectItem>
                            <SelectItem value="3">Q3</SelectItem>
                            <SelectItem value="4">Q4</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={newSprintStatus} onValueChange={(v) => setNewSprintStatus(v as 'Planned' | 'Active' | 'Completed')}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Planned">Planned</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={async () => {
                              const artId = sessionStorage.getItem(STORAGE_KEYS.ART_ID);
                              if (!artId || !newSprintStartDate || !newSprintEndDate) return;
                              const result = await sprintStorage.createSprint(
                                newSprintName,
                                artId,
                                newSprintYear,
                                format(newSprintStartDate, "yyyy-MM-dd"),
                                format(newSprintEndDate, "yyyy-MM-dd"),
                                newSprintQuarter,
                                newSprintStatus
                              );
                              if (result) {
                                const updatedSprints = await sprintStorage.getSprints(artId);
                                setSprints(updatedSprints);
                                toast.success("Sprint created successfully");
                              }
                              setIsCreatingSprint(false);
                            }}
                            className="p-2 rounded-md hover:bg-green-100 transition-colors"
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => setIsCreatingSprint(false)}
                            className="p-2 rounded-md hover:bg-red-100 transition-colors"
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {[...allSprints]
                    .sort((a, b) => {
                      if (!sprintSortField) return 0;
                      const valA = a[sprintSortField];
                      const valB = b[sprintSortField];
                      const cmp = String(valA).localeCompare(String(valB));
                      return sprintSortDir === 'asc' ? cmp : -cmp;
                    })
                    .map((sprint) => (
                      <TableRow key={sprint.sprint_id} className={sprint.status === 'Active' ? 'bg-green-50 dark:bg-green-950/20 border-l-4 border-l-green-500' : ''}>
                        <TableCell>
                          {editingSprintId === sprint.sprint_id ? (
                            <Input value={editSprintName} onChange={(e) => setEditSprintName(e.target.value)} />
                          ) : (
                            sprint.sprint_name
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSprintId === sprint.sprint_id ? (
                            <Select value={editSprintYear} onValueChange={(v) => { setEditSprintYear(v); setEditSprintStartDate(undefined); setEditSprintEndDate(undefined); }}>
                              <SelectTrigger className="w-[100px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={String(new Date().getFullYear())}>{new Date().getFullYear()}</SelectItem>
                                <SelectItem value={String(new Date().getFullYear() + 1)}>{new Date().getFullYear() + 1}</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            sprint.year
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSprintId === sprint.sprint_id ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[130px] justify-start text-left font-normal">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {editSprintStartDate ? format(editSprintStartDate, "yyyy-MM-dd") : "Pick date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={editSprintStartDate}
                                  onSelect={setEditSprintStartDate}
                                  defaultMonth={new Date(Number(editSprintYear), 0)}
                                  fromDate={new Date(Number(editSprintYear), 0, 1)}
                                  toDate={editSprintEndDate || new Date(Number(editSprintYear), 11, 31)}
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            sprint.start_date
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSprintId === sprint.sprint_id ? (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[130px] justify-start text-left font-normal">
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {editSprintEndDate ? format(editSprintEndDate, "yyyy-MM-dd") : "Pick date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={editSprintEndDate}
                                  onSelect={setEditSprintEndDate}
                                  defaultMonth={editSprintStartDate || new Date(Number(editSprintYear), 0)}
                                  fromDate={editSprintStartDate || new Date(Number(editSprintYear), 0, 1)}
                                  toDate={new Date(Number(editSprintYear), 11, 31)}
                                />
                              </PopoverContent>
                            </Popover>
                          ) : (
                            sprint.end_date
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSprintId === sprint.sprint_id ? (
                            <Select value={editSprintQuarter} onValueChange={(v) => setEditSprintQuarter(v as '1' | '2' | '3' | '4')}>
                              <SelectTrigger className="w-[80px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Q1</SelectItem>
                                <SelectItem value="2">Q2</SelectItem>
                                <SelectItem value="3">Q3</SelectItem>
                                <SelectItem value="4">Q4</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            `Q${sprint.quater}`
                          )}
                        </TableCell>
                        <TableCell>
                          {editingSprintId === sprint.sprint_id ? (
                            <Select value={editSprintStatus} onValueChange={(v) => setEditSprintStatus(v as 'Planned' | 'Active' | 'Completed')}>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Planned">Planned</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            sprint.status
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {editingSprintId === sprint.sprint_id ? (
                              <>
                                <button
                                  onClick={async () => {
                                    const artId = sessionStorage.getItem(STORAGE_KEYS.ART_ID);
                                    if (!artId || !editSprintStartDate || !editSprintEndDate) return;
                                    const result = await sprintStorage.updateSprint(
                                      sprint.sprint_id,
                                      editSprintName,
                                      artId,
                                      editSprintYear,
                                      format(editSprintStartDate, "yyyy-MM-dd"),
                                      format(editSprintEndDate, "yyyy-MM-dd"),
                                      editSprintQuarter,
                                      editSprintStatus
                                    );
                                    if (result) {
                                      setSprints((prev) =>
                                        prev.map((s) =>
                                          s.sprint_id === sprint.sprint_id
                                            ? { ...s, sprint_name: editSprintName, year: editSprintYear, start_date: format(editSprintStartDate!, "yyyy-MM-dd"), end_date: format(editSprintEndDate!, "yyyy-MM-dd"), quater: editSprintQuarter, status: editSprintStatus }
                                            : s
                                        )
                                      );
                                      toast.success("Sprint updated successfully");
                                    }
                                    setEditingSprintId(null);
                                  }}
                                  className="p-2 rounded-md hover:bg-green-100 transition-colors"
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => setEditingSprintId(null)}
                                  className="p-2 rounded-md hover:bg-red-100 transition-colors"
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingSprintId(sprint.sprint_id);
                                    setEditSprintName(sprint.sprint_name);
                                    setEditSprintYear(sprint.year);
                                    setEditSprintStartDate(new Date(sprint.start_date));
                                    setEditSprintEndDate(new Date(sprint.end_date));
                                    setEditSprintQuarter(sprint.quater);
                                    setEditSprintStatus(sprint.status);
                                  }}
                                  className="p-2 rounded-md hover:bg-slate-100 transition-colors"
                                >
                                  <Pencil className="h-4 w-4 text-slate-600" />
                                </button>
                                <button
                                  onClick={async () => {
                                    const result = await sprintStorage.deleteSprint(sprint.sprint_id);
                                    if (result) {
                                      setSprints((prev) => prev.filter((s) => s.sprint_id !== sprint.sprint_id));
                                      toast.success("Sprint deleted successfully");
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
                  {allSprints.length === 0 && !isCreatingSprint && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No sprints found. Create one to get started.
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

export default ManagerDashboard;