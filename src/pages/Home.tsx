import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Award, LogOut, Trophy, X, Vote, Users, TrendingUp, 
  ArrowLeft, Zap, Calendar, Star, Sparkles, Heart, Activity,
  Globe, Briefcase, Crown, Medal, Loader2, Info, Shield, UserCircle, ChevronRight, RefreshCw, Camera, Map, Lock, Network, Clock
} from "lucide-react";
import { AwardCategoryCard } from "@/components/AwardCategoryCard";
import { EmployeeCard } from "@/components/EmployeeCard";
import { NominationModal } from "@/components/NominationModal";
import { Employee, AwardType, Badge as BadgeType } from "@/types/employee";
import { auth, employeeStorage, nominationStorage, artManagerActions, employeeActions, getARTById, getTeamById, sprintStorage, awardStorage, StoredAward, STORAGE_KEYS, ART, Team } from "@/lib/localStorage";
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

const getDisplayName = (u: any) => {
    if (!u) return 'Unknown User';
    if (u.name && !u.firstName) return u.name;
    const first = u.firstName || '';
    const last = u.lastName || '';
    const combined = `${first} ${last}`.trim();
    if (!combined) return 'Unknown User';
    
    if (combined.toLowerCase() === 'system admin') return 'Alice (Admin)';
    if (combined.toLowerCase() === 'tech lead') return 'Bob (Manager)';
    if (combined.toLowerCase() === 'scrum master') return 'Charlie (Scrum Master)';
    
    return combined;
};

const Home = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [view, setView] = useState<'dashboard' | 'nomination' | 'history'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Onboarding States
  const [onboardingStep, setOnboardingStep] = useState<'arts' | 'teams' | 'waiting'>('arts');
  const [allArts, setAllArts] = useState<ART[]>([]);
  const [selectedArtForOnboarding, setSelectedArtForOnboarding] = useState<ART | null>(null);
  const [availableTeamsForOnboarding, setAvailableTeamsForOnboarding] = useState<Team[]>([]);

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
      return;
    }
    
    // FIX: Removed the forced routing rule that was kicking Scrum Masters out of the Home page!
    setCurrentUser(user);
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      const user = auth.getCurrentUser();
      if (!user) {
          clearInterval(interval);
          navigate("/");
          return;
      }
      
      if (user.id === currentUser?.id) {
          if (user.status !== currentUser.status || user.teamId !== currentUser.teamId) {
              // FIX: Scrum masters are allowed to stay here now!
              setCurrentUser(user);
          }
      }
    }, 2000); 
    return () => clearInterval(interval);
  }, [currentUser, navigate]);

  const fetchData = useCallback(() => {
    if (!currentUser || currentUser.status !== 'approved') return; 

    const fetchedAwards = awardStorage.getAwards();
    setSystemAwards(fetchedAwards);
    
    let targetManagerId = undefined;
    if (currentUser.role === 'employee' && currentUser.artId) {
        const art = getARTById(currentUser.artId);
        targetManagerId = art ? art.managerId : undefined;
    } else if (currentUser.role === 'art-manager') {
        targetManagerId = currentUser.id;
    }
    
    const sprints = sprintStorage.getSprints(targetManagerId);
    const currentSprint = sprints.find(s => s.status === 'active') || sprints[sprints.length - 1];
    
    if (currentSprint) setCurrentSprintName(currentSprint.title);
    else setCurrentSprintName("No Active Phase");

    const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    const allApprovedUsers = allUsers.filter((u: any) => u.status === 'approved');
    
    const allSystemTeams = artManagerActions.getTeams(); 
    const allArts = artManagerActions.getARTs();
    const allNominationsInSystem = nominationStorage.getNominations();

    setGlobalStats({
      users: 1452, // Dummy count
      arts: 14,    // Dummy count
      teams: 56    // Dummy count
    });

    const myArts = currentUser.role === 'art-manager' 
        ? artManagerActions.getARTs().filter(a => a.managerId === currentUser.id)
        : [];
    const myArtIds = currentUser.role === 'art-manager' 
        ? myArts.map(a => a.id) 
        : currentUser.role === 'employee' ? [currentUser.artId] : [];
        
    const myTeams = allSystemTeams.filter(t => myArtIds.includes(t.artId));

    // Check bounds correctly to end of day
    const checkSprintBounds = (timestampStr: string) => {
        if (!currentSprint) return false;
        const d = new Date(timestampStr).getTime();
        const start = new Date(currentSprint.startDate).setHours(0,0,0,0);
        const end = new Date(currentSprint.endDate).setHours(23,59,59,999);
        return currentSprint.status === 'active' ? (d >= start) : (d >= start && d <= end);
    };

    const employeesWithSprintData = allApprovedUsers.map((emp: any) => {
      const allBadges = nominationStorage.getNominationsForEmployee(emp.id);
      
      const currentSprintBadges = allBadges.filter(b => checkSprintBounds(b.timestamp));
      const historicalBadges = currentSprint ? allBadges.filter(b => !checkSprintBounds(b.timestamp)) : allBadges;

      const teamSize = allApprovedUsers.filter((e: any) => e.teamId === emp.teamId).length;
      const potentialVoters = Math.max(1, teamSize - 1);
      const fairnessMultiplier = SCALING_FACTOR / Math.sqrt(potentialVoters);
      
      let sprintScore = 0;
      currentSprintBadges.forEach(b => { 
          const awardDef = fetchedAwards.find(a => a.type === b.awardType);
          const basePoints = awardDef?.points || BASE_VOTE_VALUE;
          sprintScore += Math.round(basePoints * fairnessMultiplier); 
      });

      return { 
          id: emp.id,
          name: getDisplayName(emp),
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role,
          teamId: emp.teamId,
          artId: emp.artId,
          profilePicture: emp.profilePicture,
          badges: currentSprintBadges, 
          pastBadges: historicalBadges, 
          totalScore: sprintScore,
          totalAwards: allBadges.length,
          jobTitle: emp.jobTitle || 'Team Member',
          department: 'Engineering'
      };
    });

    const groupedStats = myTeams.map(team => {
        const teamEmps = employeesWithSprintData.filter((e: any) => e.teamId === team.id);
        const activeEmps = teamEmps.filter((e: any) => e.totalScore > 0);
        const top = [...activeEmps].sort((a: any, b: any) => b.totalScore - a.totalScore || a.name.localeCompare(b.name)).slice(0, 5);
        return { teamId: team.id, teamName: team.name, topPerformers: top };
    });
    setTeamStatsList(groupedStats);

    let globalFeed: any[] = [];
    if (currentSprint) {
        const sprintNoms = allNominationsInSystem.filter(n => checkSprintBounds(n.timestamp));
        sprintNoms.forEach(nom => {
            const receiver = employeesWithSprintData.find((e: any) => e.id === nom.nomineeId);
            if (!receiver) return;

            let includeInFeed = false;
            if (currentUser.role === 'employee' && receiver.teamId === currentUser.teamId) {
                includeInFeed = true;
            }
            if (currentUser.role === 'art-manager' && myTeams.some(t => t.id === receiver.teamId)) {
                includeInFeed = true;
            }

            if (includeInFeed) {
                const giverUser = employeesWithSprintData.find((e: any) => e.id === nom.nominatorId);
                globalFeed.push({
                    id: nom.id,
                    givenBy: giverUser?.name || nom.givenBy || "A Peer",
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
        const myTeamEmployees = employeesWithSprintData.filter((e: any) => e.teamId === currentUser.teamId);
        setEmployees(myTeamEmployees as any);
    } 

    const myEmployeeRecord = employeesWithSprintData.find((e: any) => e.id === currentUser.id);
    setCurrentEmployeeRecord(myEmployeeRecord as any);

    let myLifetimeBadges: BadgeType[] = [];
    if (myEmployeeRecord) {
      myLifetimeBadges = nominationStorage.getNominationsForEmployee(myEmployeeRecord.id);
    } else {
      myLifetimeBadges = nominationStorage.getNominationsForEmployee(currentUser.id);
    }

    const mySprintBadges = myLifetimeBadges.filter(b => checkSprintBounds(b.timestamp));

    const nominationsMadeCount = allNominationsInSystem.filter(n => {
        return n.nominatorId === currentUser.id && checkSprintBounds(n.timestamp);
    }).length;

    setUserStats({ 
        badgesEarned: mySprintBadges.length, 
        nominationsMade: nominationsMadeCount, 
        avgRating: myEmployeeRecord ? (myEmployeeRecord as any).totalScore : 0 
    });
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      try {
        if (currentUser.role === 'employee' && (currentUser.status === 'pending' || !currentUser.teamId)) {
            if (!currentUser.artId && !currentUser.teamId) {
                if (onboardingStep !== 'arts') setOnboardingStep('arts');
                setAllArts(artManagerActions.getARTs());
            } else if (currentUser.artId && !currentUser.teamId) {
                if (onboardingStep !== 'teams') setOnboardingStep('teams');
                const art = getARTById(currentUser.artId);
                setSelectedArtForOnboarding(art || null);
                setAvailableTeamsForOnboarding(artManagerActions.getTeams().filter(t => t.artId === currentUser.artId));
            } else if (currentUser.teamId && currentUser.status === 'pending') {
                if (onboardingStep !== 'waiting') setOnboardingStep('waiting');
            }
        }
        
        if (currentUser.status === 'approved') {
            fetchData();
            window.addEventListener('local-storage-update', fetchData);
            return () => window.removeEventListener('local-storage-update', fetchData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser, onboardingStep, fetchData]);

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

            const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
            const idx = allUsers.findIndex((u: any) => u.id === currentUser?.id);
            if (idx !== -1) {
                allUsers[idx].profilePicture = dataUrl;
                localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));
                toast.success("Profile picture updated!");
                fetchData(); 
            }
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectArtForOnboarding = (art: ART) => {
      setSelectedArtForOnboarding(art);
      setAvailableTeamsForOnboarding(artManagerActions.getTeams().filter(t => t.artId === art.id));
      setOnboardingStep('teams');
  };

  const handleRequestJoinTeam = (teamId: string, artId: string) => {
      const success = employeeActions.requestTeam(currentUser.id, artId, teamId);
      if (success) {
          toast.success("Request sent for approval!");
          setCurrentUser({ ...currentUser, artId, teamId, status: 'pending' });
          setOnboardingStep('waiting');
      } else {
          toast.error("Failed to submit request.");
      }
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

  // ==========================================
  // ONBOARDING FLOW FOR NEW EMPLOYEES
  // ==========================================
  if (currentUser.role === 'employee' && (currentUser.status === 'pending' || !currentUser.teamId)) {
      
      if (onboardingStep === 'arts') {
          return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
                <div className="max-w-4xl w-full">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome aboard, {currentUser.firstName}! 🚂</h1>
                        <p className="text-slate-500">To get started, please select your Agile Release Train (ART).</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                        {allArts.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white rounded-3xl border shadow-sm">
                                <Map className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-slate-900">No ARTs Available</h3>
                                <p className="text-slate-500 mt-1">Please ask your Train Manager to configure the system.</p>
                                <Button variant="outline" onClick={handleLogout} className="mt-4">Logout</Button>
                            </div>
                        ) : (
                            allArts.map(art => (
                                <div 
                                    key={art.id}
                                    onClick={() => handleSelectArtForOnboarding(art)}
                                    className="bg-white p-8 rounded-3xl border border-slate-200 hover:border-indigo-500 cursor-pointer shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center"
                                >
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
                                        <Briefcase className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-1">{art.name}</h2>
                                    <p className="text-sm text-slate-500 mb-4">{art.department}</p>
                                    <div className="text-indigo-600 font-bold text-sm flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        Select ART <ChevronRight className="w-4 h-4 ml-1" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {allArts.length > 0 && (
                        <div className="text-center mt-8">
                            <Button variant="ghost" onClick={handleLogout} className="text-slate-500">Sign Out</Button>
                        </div>
                    )}
                </div>
            </div>
          );
      }

      if (onboardingStep === 'teams') {
          return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-4xl w-full">
                    <Button variant="ghost" onClick={() => setOnboardingStep('arts')} className="mb-6 pl-0 hover:bg-transparent hover:text-indigo-600">
                        <ArrowLeft className="w-4 h-4 mr-2"/> Back to ARTs
                    </Button>
                    
                    <div className="text-center mb-10">
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 mb-4 px-3 py-1 text-sm border-0">
                            {selectedArtForOnboarding?.name}
                        </Badge>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Select Your Team</h1>
                        <p className="text-slate-500">Choose the specific team you belong to within this ART.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-right-4">
                        {availableTeamsForOnboarding.length === 0 ? (
                            <div className="col-span-full text-center py-12 bg-white rounded-3xl border shadow-sm">
                                <Network className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-slate-900">No Teams Available</h3>
                                <p className="text-slate-500 mt-1">There are no teams configured in this ART yet.</p>
                            </div>
                        ) : (
                            availableTeamsForOnboarding.map(team => (
                                <div 
                                    key={team.id}
                                    onClick={() => handleRequestJoinTeam(team.id, team.artId)}
                                    className="bg-white p-8 rounded-3xl border border-slate-200 hover:border-indigo-500 cursor-pointer shadow-sm hover:shadow-xl transition-all group flex flex-col items-center text-center"
                                >
                                    <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-4">
                                        <Network className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-1">{team.name}</h2>
                                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{team.description || 'No description provided.'}</p>
                                    <div className="text-indigo-600 font-bold text-sm flex items-center opacity-0 group-hover:opacity-100 transition-opacity mt-auto pt-2">
                                        Request to Join <ChevronRight className="w-4 h-4 ml-1" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
          );
      }

      if (onboardingStep === 'waiting') {
          const myTeam = getTeamById(currentUser.teamId);
          return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
                <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-10 text-center animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-amber-100 relative">
                        <Lock className="w-10 h-10 text-amber-500" />
                        <div className="absolute top-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Request Pending</h1>
                    <p className="text-slate-500 mb-6 leading-relaxed">
                        Your request to join <strong>{myTeam?.name || 'the team'}</strong> has been sent to the Train Manager and Scrum Master. You will gain access to the dashboard once they approve it.
                    </p>
                    <div className="bg-slate-50 rounded-xl p-4 mb-8 text-sm text-slate-600 font-medium flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> Waiting for manager approval...
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="w-full h-12 rounded-xl font-bold text-slate-600">
                        Sign Out
                    </Button>
                </div>
            </div>
          );
      }
  }

  const firstName = getDisplayName(currentUser).split(' ')[0];
  const fullName = getDisplayName(currentUser);
  const profilePic = currentEmployeeRecord?.profilePicture;
  const isEmployee = currentUser.role === 'employee';
  const myTeam = getTeamById(currentUser.teamId);

  const myTeamStats = teamStatsList.find(ts => ts.teamId === currentUser.teamId);
  const myTopPerformers = myTeamStats ? myTeamStats.topPerformers : [];

  return (
    <div className="min-h-screen bg-slate-50/50 relative overflow-hidden font-sans">
      
      <style>
        {`
          @keyframes antigravity { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }
          @keyframes antigravity-reverse { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(15px) rotate(3deg); } }
          .animate-float { animation: antigravity 6s ease-in-out infinite; }
          .animate-float-reverse { animation: antigravity-reverse 7s ease-in-out infinite; }
        `}
      </style>

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
            
            {currentUser?.jobTitle === 'Scrum Master' && (
                <Button 
                    variant="outline" 
                    className="mr-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-bold rounded-xl hidden sm:flex"
                    onClick={() => navigate('/scrum-master')}
                >
                    <Shield className="w-4 h-4 mr-2"/> Manager Console
                </Button>
            )}

            <div 
              className="flex items-center gap-3 p-1.5 rounded-full pr-4 cursor-pointer hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 group"
              onClick={() => fileInputRef.current?.click()}
              title="Click to update profile picture"
            >
              <div className="relative">
                {profilePic ? <img src={profilePic} className="w-8 h-8 rounded-full border border-slate-200 object-cover" /> : <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center uppercase font-bold">{firstName.charAt(0)}</div>}
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-gray-900 leading-none mb-0.5">{fullName}</p>
                <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border-indigo-100">{currentUser.role === 'art-manager' ? 'Train Manager' : currentUser.jobTitle || currentUser.role}</Badge>
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
                    className="relative w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl border-2 border-white/30 cursor-pointer group shrink-0 uppercase font-bold animate-float shadow-2xl"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change Profile Picture"
                 >
                    {profilePic ? <img src={profilePic} className="w-full h-full object-cover rounded-full" /> : firstName.charAt(0)}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
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
                          <div className="relative z-10"><h3 className="text-xl font-bold text-gray-900 mb-2"><Trophy className="inline w-5 h-5 mr-2"/> Leaderboard</h3><p className="text-sm text-gray-500">See the champions.</p></div>
                        </div>
                      </div>
                     </div>

                     <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-2xl border text-center flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-3xl font-bold text-gray-900">{userStats.badgesEarned}</span>
                            <span className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-widest">Lifetime Badges</span>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border text-center flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-3xl font-bold text-gray-900">{userStats.nominationsMade}</span>
                            <span className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-widest">Lifetime Votes</span>
                        </div>
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100 text-center flex flex-col justify-center shadow-sm hover:shadow-md transition-shadow">
                            <span className="text-3xl font-bold text-indigo-700">{userStats.avgRating}</span>
                            <span className="text-xs text-indigo-600/80 font-bold uppercase tracking-wider mt-1">Sprint Pts</span>
                        </div>
                     </div>

                     <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-300">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-500" /> Organizational Pulse
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-slate-100">
                          <div className="flex flex-col items-center justify-center text-center px-2 group relative">
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{globalStats.users.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1"><Users className="w-3 h-3"/> Active Users</div>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center px-2 group relative">
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{globalStats.arts.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1"><Map className="w-3 h-3"/> Active ARTs</div>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center px-2 group relative">
                            <div className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{globalStats.teams.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1"><Briefcase className="w-3 h-3"/> Total Teams</div>
                          </div>
                          <div className="flex flex-col items-center justify-center text-center px-2 group relative">
                            <div className="text-2xl font-bold text-emerald-600 group-hover:text-emerald-500 transition-colors">High</div>
                            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-1"><Zap className="w-3 h-3"/> Engagement</div>
                          </div>
                        </div>
                     </div>
                 </div>

                 <div className="lg:col-span-1 space-y-8">
                     <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden h-full">
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
                                 {emp.profilePicture ? 
                                    <img src={emp.profilePicture} className="w-8 h-8 rounded-full object-cover shadow-sm"/> :
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold uppercase shadow-sm">{emp.name.charAt(0)}</div>
                                 }
                                 <div>
                                   <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
                                   <p className="text-[10px] text-muted-foreground">{emp.jobTitle}</p>
                                 </div>
                               </div>
                               <Badge variant="secondary" className="bg-white border border-slate-200 text-indigo-600 font-bold shadow-sm">{emp.totalScore} pts</Badge>
                             </div>
                           ))
                         }
                       </div>
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