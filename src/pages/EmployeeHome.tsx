import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { UserStorage, artStorage, employeeStorage } from "@/lib/ApiStorage";
import { UserProfileData, ArtsAndTeamsData, UserHomePageData, STORAGE_KEYS } from "@/data/models/Interfaces";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, Trophy, Star, Building2, Activity, UserCheck, Zap, LogOut, Pencil, ArrowLeft, RefreshCw } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const ChampionCard = ({ name, image, nominations, award }: { name: string; image: string; nominations: number; award: string }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/60 backdrop-blur border border-white/40 shadow-sm">
    <img src={image ? BASE_URL + image : "/placeholder.svg"} alt={name} className="h-10 w-10 rounded-full object-cover ring-2 ring-yellow-300" />
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-slate-800 text-sm truncate">{name}</p>
      <p className="text-xs text-muted-foreground truncate">{award}</p>
    </div>
    <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">
      <Star className="h-3 w-3" />{nominations}
    </div>
  </div>
);

const EmployeeHome = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [homePageData, setHomePageData] = useState<UserHomePageData | null>(null);
  const [artsAndTeams, setArtsAndTeams] = useState<ArtsAndTeamsData[]>([]);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [selectedArtId, setSelectedArtId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [joining, setJoining] = useState(false);

  // Edit Profile State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editData, setEditData] = useState({
    user_login: "",
    user_firstname: "",
    user_lastname: "",
    user_role: "",
    password: "",
    user_image: null as File | null,
    image_preview: "" as string,
  });

  const loadProfile = useCallback(async () => {
    const data = await UserStorage.getCurrentUserDetails();
    if (data) {
      setProfile(data);
      sessionStorage.setItem(STORAGE_KEYS.ART_ID, data.art_id || "");
    }
  }, []);

  const loadHomePageData = useCallback(async () => {
    const data = await employeeStorage.getUserHomePageData();
    if (data) setHomePageData(data);
  }, []);

  const handleOpenEditDialog = () => {
    if (profile) {
      const storedLogin = sessionStorage.getItem(STORAGE_KEYS.USER_LOGIN) || "";
      setEditData({
        user_login: storedLogin,
        user_firstname: profile.employee_name?.split(" ")[0] || "",
        user_lastname: profile.employee_name?.split(" ").slice(1).join(" ") || "",
        user_role: profile.employee_role || "",
        password: "",
        user_image: null,
        image_preview: profile.image ? BASE_URL + profile.image : "",
      });
      setShowEditDialog(true);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditData({ ...editData, user_image: file });
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditData((prev) => ({ ...prev, image_preview: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!editData.user_login.trim() || !editData.user_firstname.trim() || !editData.user_lastname.trim() || !editData.user_role.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setEditLoading(true);
    const result = await UserStorage.updateUserProfile(
      editData.user_login,
      editData.user_firstname,
      editData.user_lastname,
      editData.user_role,
      editData.password.trim(), // Only send password if it's not empty - handled on backend
      editData.user_image
    );
    setEditLoading(false);

    if (result) {
      toast.success("Profile updated successfully!");
      setShowEditDialog(false);
      await loadProfile();
    } else {
      toast.error("Failed to update profile");
    }
  };

  useEffect(() => {
    const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE);
    if (!userRole || userRole === "Admin" || userRole === "Art Manager") {
      navigate("/");
      return;
    }
    loadProfile();
    loadHomePageData();
  }, [navigate, loadProfile, loadHomePageData]);

  const handleOpenJoinDialog = async () => {
    const data = await artStorage.getArtAndTeamsData();
    if (data) {
      setArtsAndTeams(Array.isArray(data) ? data : [data]);
    }
    setSelectedArtId("");
    setSelectedTeamId("");
    setShowJoinDialog(true);
  };

  const selectedArt = artsAndTeams.find((a) => a.art_id === selectedArtId);

  const handleJoin = async () => {
    if (!selectedTeamId) return;
    setJoining(true);
    const result = await employeeStorage.joinTeam(selectedTeamId);
    setJoining(false);
    if (result) {
      toast.success("Join request sent successfully!");
      setShowJoinDialog(false);
      await loadProfile();
    }
  };

  const handleLogout = async () => {
    await UserStorage.logoutUser();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back{profile ? `, ${profile.employee_name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening across your organization</p>
        </div>
        {profile && (
          <div className="flex items-center gap-3">
            <img src={profile.image ? BASE_URL + profile.image : "/placeholder.svg"} alt={profile.employee_name} className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-300" />
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">{profile.employee_name}</p>
              <p className="text-xs text-muted-foreground">{profile.employee_role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleOpenEditDialog} className="ml-2 text-slate-600 hover:text-indigo-600 hover:border-indigo-300">
              <Pencil className="h-4 w-4 mr-1" />Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="text-slate-600 hover:text-indigo-600 hover:border-indigo-300">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { await handleLogout(); }} className="text-slate-600 hover:text-red-600 hover:border-red-300">
              <LogOut className="h-4 w-4 mr-1" />Logout
            </Button>
          </div>
        )}
      </div>

      <div className="px-8 py-6 space-y-8 max-w-7xl mx-auto">

        {/* Profile + Stats row */}
        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="md:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 shadow-lg">
              <CardContent className="p-6 flex items-center gap-4">
                <img src={profile.image ? BASE_URL + profile.image : "/placeholder.svg"} alt={profile.employee_name} className="h-16 w-16 rounded-full object-cover ring-4 ring-white/40" />
                <div className="flex-1">
                  <p className="font-bold text-xl">{profile.employee_name}</p>
                  <p className="text-indigo-200 text-sm">{profile.employee_role}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {profile.team_name
                      ? <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{profile.team_name}</span>
                      : <button onClick={handleOpenJoinDialog} className="flex items-center gap-1 bg-white/20 hover:bg-white/30 transition-colors text-white text-xs px-3 py-1 rounded-full"><Users className="h-3 w-3" />Join a Team</button>
                    }
                    {profile.art_name && <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{profile.art_name}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${profile.active_status === "approved" ? "bg-green-400/30 text-green-100" : "bg-yellow-400/30 text-yellow-100"}`}>{profile.active_status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-400 to-orange-500 text-white border-0 shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <Trophy className="h-7 w-7 text-white/80" />
                <div>
                  <p className="text-3xl font-extrabold">{profile.total_awards}</p>
                  <p className="text-orange-100 text-sm mt-1">Awards Earned</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-400 to-teal-600 text-white border-0 shadow-lg">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <Zap className="h-7 w-7 text-white/80" />
                <div>
                  <p className="text-3xl font-extrabold">{profile.total_points}</p>
                  <p className="text-emerald-100 text-sm mt-1">Total Points</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card onClick={() => navigate("/nominations")} className="border-0 shadow-md bg-gradient-to-br from-violet-500 to-purple-600 text-white cursor-pointer hover:shadow-xl transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold">Nominate a Teammate</p>
                <p className="text-purple-200 text-sm mt-0.5">Recognise someone who made a difference</p>
              </div>
            </CardContent>
          </Card>

          <Card onClick={() => navigate("/leaderboard")} className="border-0 shadow-md bg-gradient-to-br from-sky-500 to-blue-600 text-white cursor-pointer hover:shadow-xl transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold">Leaderboard</p>
                <p className="text-sky-200 text-sm mt-0.5">See who's leading the pack this sprint</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organisation Pulse */}
        {homePageData && (
          <>
            {/* Pulse stats */}
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500" />Organisation Pulse</h2>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center"><Zap className="h-6 w-6 text-blue-600" /></div>
                    <div>
                      <p className="text-2xl font-extrabold text-slate-900">{homePageData.total_nominations_done_in_last_day}</p>
                      <p className="text-sm text-muted-foreground">Nominations in Last 24h</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center"><UserCheck className="h-6 w-6 text-green-600" /></div>
                    <div>
                      <p className="text-2xl font-extrabold text-slate-900">{homePageData.total_active_Employees}</p>
                      <p className="text-sm text-muted-foreground">Active Employees</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Champions sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ART Sprint Champions */}
              <Card className="border-0 shadow-md bg-gradient-to-b from-yellow-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-700">
                    <Trophy className="h-4 w-4" />Last Sprint — ART Top 5
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {homePageData.last_sprint_top5_champions_in_your_art.length > 0
                    ? homePageData.last_sprint_top5_champions_in_your_art.map((c, i) => (
                      <ChampionCard key={i} name={c.employee_name} image={c.employee_image} nominations={c.no_of_nominations_received} award={c.most_received_award_name} />
                    ))
                    : <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                  }
                </CardContent>
              </Card>

              {/* ART Level Champions */}
              <Card className="border-0 shadow-md bg-gradient-to-b from-indigo-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
                    <Star className="h-4 w-4" />ART Level — All Time Top 5
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {homePageData.art_level_champions_top5.length > 0
                    ? homePageData.art_level_champions_top5.map((c, i) => (
                      <ChampionCard key={i} name={c.employee_name} image={c.employee_image} nominations={c.no_of_nominations_received} award={c.most_received_award_name} />
                    ))
                    : <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                  }
                </CardContent>
              </Card>

              {/* Organisation Level Champions */}
              <Card className="border-0 shadow-md bg-gradient-to-b from-emerald-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-700">
                    <Building2 className="h-4 w-4" />Organisation — All Time Top 5
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {homePageData.organization_level_champions_top5_till_now.length > 0
                    ? homePageData.organization_level_champions_top5_till_now.map((c, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/60 backdrop-blur border border-white/40 shadow-sm">
                        <img src={c.employee_image ? BASE_URL + c.employee_image : "/placeholder.svg"} alt={c.employee_name} className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-300" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 text-sm truncate">{c.employee_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.team_name} · {c.art_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.most_received_award_name}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-bold shrink-0">
                          <Star className="h-3 w-3" />{c.no_of_nominations_received}
                        </div>
                      </div>
                    ))
                    : <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                  }
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Join Team Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join a Team</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Select ART</p>
              <Select
                value={selectedArtId}
                onValueChange={(val) => {
                  setSelectedArtId(val);
                  setSelectedTeamId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an ART..." />
                </SelectTrigger>
                <SelectContent>
                  {artsAndTeams.map((art) => (
                    <SelectItem key={art.art_id} value={art.art_id}>
                      {art.department} — {art.art_name} ({art.art_manager})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Select Team</p>
              <Select
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
                disabled={!selectedArtId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedArtId ? "Choose a team..." : "Select an ART first"} />
                </SelectTrigger>
                <SelectContent>
                  {selectedArt?.teams.map((team) => (
                    <SelectItem key={team.team_id} value={team.team_id}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={!selectedArtId || !selectedTeamId || joining}
            >
              {joining ? "Joining..." : "Join Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-4">
              <img
                src={editData.image_preview || "/placeholder.svg"}
                alt="Profile preview"
                className="h-24 w-24 rounded-full object-cover ring-2 ring-indigo-300"
              />
              <div className="w-full">
                <Label htmlFor="image" className="text-sm font-medium">
                  Profile Image
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Login */}
            <div>
              <Label htmlFor="login" className="text-sm font-medium">
                Login
              </Label>
              <Input
                id="login"
                value={editData.user_login}
                onChange={(e) => setEditData({ ...editData, user_login: e.target.value })}
                placeholder="Enter login"
                className="mt-1"
              />
            </div>

            {/* First Name */}
            <div>
              <Label htmlFor="firstname" className="text-sm font-medium">
                First Name
              </Label>
              <Input
                id="firstname"
                value={editData.user_firstname}
                onChange={(e) => setEditData({ ...editData, user_firstname: e.target.value })}
                placeholder="Enter first name"
                className="mt-1"
              />
            </div>

            {/* Last Name */}
            <div>
              <Label htmlFor="lastname" className="text-sm font-medium">
                Last Name
              </Label>
              <Input
                id="lastname"
                value={editData.user_lastname}
                onChange={(e) => setEditData({ ...editData, user_lastname: e.target.value })}
                placeholder="Enter last name"
                className="mt-1"
              />
            </div>

            {/* Role */}
            <div>
              <Label htmlFor="role" className="text-sm font-medium">
                Role
              </Label>
              <select
                id="role"
                value={editData.user_role}
                onChange={(e) => setEditData({ ...editData, user_role: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a role</option>
                <option value="Product Manager">Product Manager</option>
                <option value="Product Owner">Product Owner</option>
                <option value="Manager">Manager</option>
                <option value="Scrum Master">Scrum Master</option>
                <option value="Full Stack Developer">Full Stack Developer</option>
                <option value="QA">QA</option>
                <option value="Front-end developer">Front-end developer</option>
                <option value="Back-end developer">Back-end developer</option>
                <option value="Devops Engineer">Devops Engineer</option>
                <option value="PBI developer">PBI developer</option>
                <option value="Site Reliability Engineer">Site Reliability Engineer</option>
                <option value="ETL developer">ETL developer</option>
                <option value="TBA/PDA">TBA/PDA</option>
                <option value="System Architect">System Architect</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                Password (Optional)
              </Label>
              <Input
                id="password"
                type="password"
                value={editData.password}
                onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                placeholder="Leave blank to keep current password"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={editLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={editLoading}
            >
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeHome;
