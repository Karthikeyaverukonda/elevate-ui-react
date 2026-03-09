import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Award, LogOut, Trophy, X, Vote, Users, TrendingUp, 
  ArrowLeft, Zap, Calendar, Star, Sparkles, Heart, Activity,
  Globe, Briefcase, Crown, Medal, Loader2, Info, Shield, UserCircle, ChevronRight, RefreshCw, Camera, Map
} from "lucide-react";
import { AwardCategoryCard } from "@/components/AwardCategoryCard";
import { EmployeeCard } from "@/components/EmployeeCard";
import { NominationModal } from "@/components/NominationModal";
import { Employee, AwardType, Badge as BadgeType } from "@/types/employee";
import { auth, employeeStorage, nominationStorage, artManagerActions, employeeActions, getARTById, getTeamById, sprintStorage, awardStorage, StoredAward, STORAGE_KEYS } from "@/lib/localStorage";
import { toast } from "sonner";
import { Card } from "@/components/ui/card"; 

const SCALING_FACTOR = 3.0;
const BASE_VOTE_VALUE = 50;

interface EmployeeWithHistory extends Employee {
  pastBadges: BadgeType[];
}

interface TeamStats {
  teamId: string;
  teamName: string;
  topPerformers: Employee[];
}

const Home = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [view, setView] = useState<'dashboard' | 'nomination' | 'history'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [myArt, setMyArt] = useState<any>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentEmployeeRecord, setCurrentEmployeeRecord] = useState<Employee | undefined>(undefined);
  const [employees, setEmployees] = useState<EmployeeWithHistory[]>([]);
  
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [teamStatsList, setTeamStatsList] = useState<TeamStats[]>([]);

  const [userStats, setUserStats] = useState({ badgesEarned: 0, nominationsMade: 0, avgRating: 0 });
  const [globalStats, setGlobalStats] = useState({ users: 0, arts: 0, teams: 0 });
  
  const [systemAwards, setSystemAwards] = useState<StoredAward[]>([]);
  const [currentSprintName, setCurrentSprintName] = useState<string>("Loading Phase...");

  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedAward, setSelectedAward] = useState<AwardType | null>(null);
  const [isNominationOpen, setIsNominationOpen] = useState(false);
  const [filterAward, setFilterAward] = useState<AwardType | null>(null);

  useEffect(() => {
    const user = auth.getCurrentUser();
    if (!user) {
      navigate("/");
    } else {
      setCurrentUser(user);
    }
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser?.role === 'employee' && currentUser?.teamId) {
        const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
        const myDbRecord = allUsers.find((u: any) => u.id === currentUser.id);
        
        if (myDbRecord && !myDbRecord.teamId) {
          clearInterval(interval);
          auth.logout();
          toast.error("Your team was dissolved by the Train Manager. You have been logged out.");
          navigate("/");
        }
      }
    }, 2000); 
    return () => clearInterval(interval);
  }, [currentUser, navigate]);

  useEffect(() => {
    if (currentUser) {
      try {
        if (currentUser.role === 'employee' && currentUser.artId && !currentUser.teamId) {
            const art = getARTById(currentUser.artId);
            setMyArt(art);
            const allTeams = artManagerActions.getTeams(); 
            const filteredTeams = allTeams.filter(t => t.artId === currentUser.artId); 
            setAvailableTeams(filteredTeams);
        }
        fetchData();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        toast.error("Image too large (Max 2MB)");
        return;
    }

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

            const allEmployees = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || "[]");
            const idx = allEmployees.findIndex((emp: any) => emp.id === currentUser?.id);
            
            if (idx !== -1) {
                allEmployees[idx].profilePicture = dataUrl;
                localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(allEmployees));
                toast.success("Profile picture updated!");
                fetchData(); 
            } else {
                toast.error("Could not find employee record.");
            }
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleJoinTeam = (teamId: string) => {
    if (employeeActions.joinTeam(currentUser.id, teamId)) {
        toast.success("Joined Team Successfully!");
        const updatedUser = auth.getCurrentUser();
        setCurrentUser(updatedUser);
        setShowTeamSelection(false);
    } else {
        toast.error("Failed to join team.");
    }
  };

  const fetchData = () => {
    if (!currentUser) return; 

    // FIXED: Awards are now completely global, fetched identically for everyone!
    setSystemAwards(awardStorage.getAwards());
    
    let targetManagerId = undefined;
    if (currentUser.role === 'employee' && currentUser.artId) {
        const art = getARTById(currentUser.artId);
        targetManagerId = art ? art.managerId : undefined;
    } else if (currentUser.role === 'art-manager') {
        targetManagerId = currentUser.id;
    }
    
    const sprints = sprintStorage.getSprints(targetManagerId);
    const currentSprint = sprints.find(s => s.status === 'active') || sprints[sprints.length - 1];
    
    if (currentSprint) {
        setCurrentSprintName(currentSprint.title);
    } else {
        setCurrentSprintName("No Active Phase");
    }

    const allEmployees = employeeStorage.getEmployees();
    const allSystemTeams = artManagerActions.getTeams(); 
    const allArts = artManagerActions.getARTs();
    const allNominationsInSystem = nominationStorage.getNominations();

    setGlobalStats({
      users: allEmployees.length,
      arts: allArts.length,
      teams: allSystemTeams.length
    });

    const myArts = currentUser.role === 'art-manager' 
        ? artManagerActions.getARTs().filter(a => a.managerId === currentUser.id)
        : [];
    const myArtIds = currentUser.role === 'art-manager' 
        ? myArts.map(a => a.id) 
        : currentUser.role === 'employee' ? [currentUser.artId] : [];
        
    const myTeams = allSystemTeams.filter(t => myArtIds.includes(t.artId));

    const employeesWithSprintData = allEmployees.map(emp => {
      const allBadges = nominationStorage.getNominationsForEmployee(emp.id);
      
      const currentSprintBadges = allBadges.filter(b => {
        if (!currentSprint) return false;
        const d = new Date(b.timestamp).getTime();
        const start = new Date(currentSprint.startDate).getTime();
        if (currentSprint.status === 'active') return d >= start;
        const end = new Date(currentSprint.endDate).getTime();
        return d >= start && d <= end;
      });

      const historicalBadges = currentSprint ? allBadges.filter(b => new Date(b.timestamp).getTime() < new Date(currentSprint.startDate).getTime()) : allBadges;

      const empTeamSize = allEmployees.filter(e => e.teamId === emp.teamId).length;
      const potentialVoters = Math.max(1, empTeamSize - 1);
      const fairnessMultiplier = SCALING_FACTOR / Math.sqrt(potentialVoters);
      
      let sprintScore = 0;
      currentSprintBadges.forEach(() => { sprintScore += Math.round(BASE_VOTE_VALUE * fairnessMultiplier); });

      return { ...emp, badges: currentSprintBadges, pastBadges: historicalBadges, totalScore: sprintScore };
    });

    const groupedStats = myTeams.map(team => {
        const teamEmps = employeesWithSprintData.filter(e => e.teamId === team.id);
        const activeEmps = teamEmps.filter(e => e.totalScore > 0);
        const top = [...activeEmps].sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name)).slice(0, 3);
        return {
            teamId: team.id,
            teamName: team.name,
            topPerformers: top
        };
    });
    setTeamStatsList(groupedStats);

    let globalFeed: any[] = [];
    
    if (currentSprint) {
        const sprintNoms = allNominationsInSystem.filter(n => {
            const d = new Date(n.timestamp).getTime();
            const start = new Date(currentSprint.startDate).getTime();
            if (currentSprint.status === 'active') return d >= start;
            return d >= start && d <= new Date(currentSprint.endDate).getTime();
        });

        sprintNoms.forEach(nom => {
            const receiver = allEmployees.find(e => e.id === nom.nomineeId);
            if (!receiver) return;

            let includeInFeed = false;
            if (currentUser.role === 'employee' && receiver.teamId === currentUser.teamId) {
                includeInFeed = true;
            }
            if (currentUser.role === 'art-manager' && myTeams.some(t => t.id === receiver.teamId)) {
                includeInFeed = true;
            }

            if (includeInFeed) {
                const giverUser = allEmployees.find(e => e.id === nom.nominatorId);
                globalFeed.push({
                    id: nom.id,
                    givenBy: nom.givenBy || giverUser?.name || "A Peer",
                    receiverName: receiver.name,
                    receiverImg: receiver.profilePicture,
                    awardType: nom.awardType,
                    timestamp: nom.timestamp
                });
            }
        });
    }

    globalFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivity(globalFeed.slice(0, 10));

    if (currentUser.role === 'employee') {
        const myTeamEmployees = employeesWithSprintData.filter(e => e.teamId === currentUser.teamId);
        setEmployees(myTeamEmployees);
    } 

    const myEmployeeRecord = allEmployees.find(e => e.id === currentUser.id);
    setCurrentEmployeeRecord(myEmployeeRecord);

    let myLifetimeBadges: BadgeType[] = [];
    if (myEmployeeRecord) {
      myLifetimeBadges = nominationStorage.getNominationsForEmployee(myEmployeeRecord.id);
    } else {
      myLifetimeBadges = nominationStorage.getNominationsForEmployee(currentUser.id);
    }

    const mySprintBadges = currentSprint ? myLifetimeBadges.filter(b => {
        const d = new Date(b.timestamp).getTime();
        const start = new Date(currentSprint.startDate).getTime();
        if (currentSprint.status === 'active') return d >= start;
        return d >= start && d <= new Date(currentSprint.endDate).getTime();
    }) : [];

    const nominationsMadeCount = currentSprint ? allNominationsInSystem.filter(n => {
        const d = new Date(n.timestamp).getTime();
        const start = new Date(currentSprint.startDate).getTime();
        const isCurrent = currentSprint.status === 'active' ? (d >= start) : (d >= start && d <= new Date(currentSprint.endDate).getTime());
        return n.nominatorId === currentUser.id && isCurrent;
    }).length : 0;

    const mySprintRecord = employeesWithSprintData.find(e => e.id === currentUser.id);

    setUserStats({ 
        badgesEarned: mySprintBadges.length, 
        nominationsMade: nominationsMadeCount, 
        avgRating: mySprintRecord ? mySprintRecord.totalScore : 0 
    });
  };

  const handleLogout = () => {
    auth.logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleNominate = (employee: Employee, awardType: AwardType) => {
    setSelectedEmployee(employee);
    setSelectedAward(awardType);
    setIsNominationOpen(true);
  };

  const filteredEmployees = employees.filter((emp) => emp.id !== currentUser?.id);

  const renderRankIcon = (index: number, score: number, allTop: Employee[]) => {
    let rank = 1;
    if (index > 0 && score < allTop[index - 1].totalScore) rank = index + 1;
    else if (index > 0 && score === allTop[index - 1].totalScore) {
      if (index === 1) rank = 1;
      if (index === 2) rank = allTop[1].totalScore === allTop[0].totalScore ? 1 : 2;
    }
    if (rank === 1) return <span className="text-2xl" role="img">🥇</span>;
    if (rank === 2) return <span className="text-2xl" role="img">🥈</span>;
    if (rank === 3) return <span className="text-2xl" role="img">🥉</span>;
    return <span className="text-slate-500 font-bold">#{rank}</span>;
  };

  if (!currentUser || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 text-indigo-600 animate-spin" /></div>;
  }

  if (currentUser.role === 'employee' && currentUser.artId && !currentUser.teamId) {
      const art = getARTById(currentUser.artId);
      const allSystemTeams = artManagerActions.getTeams(); 
      const availableDynamicTeams = allSystemTeams.filter(t => t.artId === currentUser.artId);

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-3xl w-full">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome aboard, {currentUser.firstName}! 🚂</h1>
                    <p className="text-slate-500">You have been assigned to the <strong>{art?.name}</strong> ART. <br/>Please join your specific team to start nominating peers.</p>
                </div>

                {!showTeamSelection ? (
                     <div 
                        onClick={() => setShowTeamSelection(true)}
                        className="bg-white p-8 rounded-3xl border-2 border-indigo-100 hover:border-indigo-500 cursor-pointer shadow-sm hover:shadow-xl transition-all group flex items-center justify-between"
                     >
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Briefcase className="w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">{art?.name}</h2>
                                <p className="text-slate-500">{art?.department}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-600" />
                     </div>
                ) : (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-center">
                            <Button variant="ghost" onClick={() => setShowTeamSelection(false)} className="pl-0"><ArrowLeft className="w-4 h-4 mr-2"/> Back</Button>
                            <Button variant="outline" size="sm" onClick={() => fetchData()} className="text-indigo-600"><RefreshCw className="w-4 h-4 mr-2"/> Refresh Teams</Button>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-slate-800">Available Teams in {art?.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {availableDynamicTeams.length === 0 ? (
                                <div className="col-span-2 text-center py-10 bg-white rounded-2xl border">
                                  <p className="text-slate-400">No teams created in this ART yet.</p>
                                  <Button variant="ghost" onClick={() => setShowTeamSelection(false)} className="mt-2">Go Back</Button>
                                </div>
                            ) : (
                                availableDynamicTeams.map(t => (
                                    <div key={t.id} className="bg-white p-6 rounded-2xl border hover:shadow-lg transition-all space-y-4">
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900">{t.name}</h4>
                                            <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                                        </div>
                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => handleJoinTeam(t.id)}>Join Team</Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      );
  }

  const firstName = currentUser.firstName || 'Team Member';
  const fullName = currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'Team Member';
  const profilePic = currentEmployeeRecord?.profilePicture;
  const isEmployee = currentUser.role === 'employee';
  const myTeam = getTeamById(currentUser.teamId);

  const myTeamStats = teamStatsList.find(ts => ts.teamId === currentUser.teamId);
  const myTopPerformers = myTeamStats ? myTeamStats.topPerformers : [];

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleImageUpload} 
      />

      <header className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white"><Sparkles className="w-5 h-5" /></div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">Elevate</h1>
          </div>
          <div className="flex items-center gap-4">
            
            <div 
              className="flex items-center gap-3 p-1.5 rounded-full pr-4 cursor-pointer hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 group"
              onClick={() => fileInputRef.current?.click()}
              title="Click to update profile picture"
            >
              <div className="relative">
                {profilePic ? <img src={profilePic} className="w-8 h-8 rounded-full border border-slate-200 object-cover" /> : <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><UserCircle className="w-5 h-5" /></div>}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-gray-900 leading-none mb-0.5">{fullName}</p>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border-indigo-100">{currentUser.role === 'art-manager' ? 'Train Manager' : currentUser.role}</Badge>
              </div>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-red-500 hover:bg-red-50"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {view === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-indigo-500/20">
               <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-6">
                 
                 <div 
                    className="relative w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border-2 border-white/30 overflow-hidden cursor-pointer group shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change Profile Picture"
                 >
                    {profilePic ? <img src={profilePic} className="w-full h-full object-cover" /> : firstName.charAt(0)}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Camera className="w-6 h-6 text-white" />
                    </div>
                 </div>

                 <div className="text-center md:text-left">
                     <h2 className="text-3xl font-bold mb-2">Welcome back, {firstName}! 👋</h2>
                     <p className="text-indigo-100 text-lg max-w-xl">
                        {myTeam ? `Team: ${myTeam.name}` : "Celebrate achievements. Empower people."}
                     </p>
                     <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/30 text-sm font-semibold text-white shadow-sm">
                        <Calendar className="w-4 h-4 text-indigo-100" />
                        Current Phase: {currentSprintName}
                     </div>
                 </div>
              </div>
            </section>

            {isEmployee && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className="lg:col-span-2 space-y-8">
                     <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Quick Actions</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div onClick={() => setView('nomination')} className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300">
                          <div className="relative z-10"><h3 className="text-xl font-bold text-gray-900 mb-2"><Vote className="inline w-5 h-5 mr-2"/> Nominate Peer</h3><p className="text-sm text-gray-500">Recognize amazing work.</p></div>
                        </div>
                        <div onClick={() => navigate('/leaderboard')} className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-orange-200 transition-all duration-300">
                          <div className="relative z-10"><h3 className="text-xl font-bold text-gray-900 mb-2"><Trophy className="inline w-5 h-5 mr-2"/> Leaderboard</h3><p className="text-sm text-gray-500">See the charts.</p></div>
                        </div>
                      </div>
                     </div>

                     <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border text-center flex flex-col justify-center">
                            <span className="text-2xl font-bold text-gray-900">{userStats.badgesEarned}</span>
                            <span className="text-xs text-muted-foreground font-medium mt-1">Badges Received</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border text-center flex flex-col justify-center">
                            <span className="text-2xl font-bold text-gray-900">{userStats.nominationsMade}</span>
                            <span className="text-xs text-muted-foreground font-medium mt-1">Votes Cast</span>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 text-center flex flex-col justify-center">
                            <span className="text-2xl font-bold text-indigo-700">{userStats.avgRating}</span>
                            <span className="text-xs text-indigo-600/80 font-bold uppercase tracking-wider mt-1">Sprint Pts</span>
                        </div>
                     </div>

                     <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-500" /> Organizational Pulse
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-slate-100">
                          <div className="flex flex-col items-center justify-center text-center px-2 group relative">
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{globalStats.users}</div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1"><Users className="w-3 h-3"/> Active Users</div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                               Total registered employees
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center px-2 group relative">
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{globalStats.arts}</div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1"><Map className="w-3 h-3"/> Active ARTs</div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                               Total active Release Trains
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center px-2 group relative">
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{globalStats.teams}</div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1"><Briefcase className="w-3 h-3"/> Total Teams</div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                               Total registered teams
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center px-2 group relative">
                            <div className="text-2xl font-bold text-emerald-600 group-hover:text-emerald-500 transition-colors">High</div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1"><Zap className="w-3 h-3"/> Engagement</div>
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                               Current platform activity level
                            </div>
                          </div>
                        </div>
                     </div>
                 </div>

                 <div className="lg:col-span-1 space-y-8">
                     <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
                       <div className="flex items-center justify-between mb-4">
                         <h3 className="font-bold text-gray-900 flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-500" /> Top Performers</h3>
                         <Button variant="link" className="text-xs text-indigo-600 p-0 h-auto" onClick={() => navigate('/leaderboard')}>Full board →</Button>
                       </div>
                       <p className="text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">Showing leaders for your team ({myTeam?.name}) in {currentSprintName}</p>
                       <div className="space-y-3">
                         {myTopPerformers.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">No data yet.</p> : 
                           myTopPerformers.map((emp, i) => (
                             <div key={emp.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                               <div className="flex items-center gap-3">
                                 <div className="w-6 text-center text-xl font-bold">{renderRankIcon(i, emp.totalScore, myTopPerformers)}</div>
                                 <img src={emp.profilePicture} className="w-8 h-8 rounded-full object-cover"/>
                                 <div>
                                   <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                                   <p className="text-[10px] text-muted-foreground">{emp.jobTitle}</p>
                                 </div>
                               </div>
                               <Badge variant="secondary" className="bg-white border border-slate-200 text-indigo-600 font-bold">{emp.totalScore} pts</Badge>
                             </div>
                           ))
                         }
                       </div>
                     </div>

                     <div className="bg-white rounded-2xl border shadow-sm h-full p-4 overflow-y-auto max-h-[500px]">
                        <h3 className="font-semibold mb-4 text-slate-800">Activity in {currentSprintName}</h3>
                        {recentActivity.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">No activity yet.</div> : 
                        recentActivity.map(item => (
                            <div key={item.id} className="flex gap-3 text-sm mb-4 border-b border-slate-50 pb-3 last:border-0">
                              <img src={item.receiverImg} className="w-8 h-8 rounded-full shadow-sm object-cover" />
                              <div className="leading-snug">
                                  <span className="font-bold text-slate-900">{item.givenBy}</span> recognized <span className="font-bold text-indigo-600">{item.receiverName}</span>
                                  <div className="text-xs text-slate-500 mt-1">{item.awardType}</div>
                              </div>
                            </div>
                        ))}
                     </div>
                 </div>
              </div>
            )}
          </div>
        )}
        
        {view === 'nomination' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
             <Button variant="ghost" className="mb-6 pl-0" onClick={() => setView('dashboard')}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
             <section className="mb-12">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {systemAwards.map(cat => (
                    <AwardCategoryCard 
                        key={cat.id} 
                        category={{...cat, name: cat.type} as any}
                        onClick={() => setFilterAward(filterAward === cat.type ? null : (cat.type as AwardType))} 
                        isSelected={filterAward === cat.type} 
                    />
                ))}
               </div>
            </section>
            <section>
              <h3 className="text-xl font-bold mb-4 text-slate-800">Select Teammate</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map(emp => <EmployeeCard key={emp.id} employee={emp} onNominate={filterAward ? (e) => handleNominate(e, filterAward) : handleNominate} preselectedAward={filterAward} isDisabled={false} />)}
              </div>
            </section>
          </div>
        )}
      </main>

      <NominationModal isOpen={isNominationOpen} onClose={() => { setIsNominationOpen(false); fetchData(); setView('dashboard'); }} employee={selectedEmployee} awardType={selectedAward} />
      
    </div>
  );
};

export default Home;