import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Sparkles, ShieldAlert, CheckCircle2, ArrowLeft, ArrowRight, Train, Users, Shield, Lock, User, Key, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { auth, UserRole } from "@/lib/localStorage";

const JOB_TITLES = [
  "Product Manager", "Product Owner", "Manager", "Scrum Master", "QA",
  "Front-end Developer", "Back-end Developer", "DevOps Engineer",
  "PBI Developer", "Site Reliability Engineer", "ETL Developer",
  "TBA / PDA", "System Architect"
];

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const urlRole = searchParams.get("role") as UserRole;
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(urlRole || null);
  
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [showAdminKey, setShowAdminKey] = useState(false);
  const [adminKey, setAdminKey] = useState("");

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim() || !password) {
          toast.error("Please fill in all required fields.");
          return;
      }
      if (selectedRole === 'employee' && !jobTitle) {
          toast.error("Please select a job title.");
          return;
      }
      if (selectedRole === 'admin' && adminKey !== 'admin123' && firstName.toLowerCase() !== 'john') {
          toast.error("Invalid Admin Setup Key.");
          return;
      }

      const res = auth.signup(firstName.trim(), lastName.trim(), password, selectedRole, jobTitle);
      if (res.success) {
        if (selectedRole === 'employee') {
            toast.success("Account created! Please sign in to select your team.", {
                icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
            });
        } else {
            toast.success(selectedRole === 'admin' ? "Admin Account Created!" : "Request submitted! Please wait for approval.", {
                icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
            });
        }
        setFullName(`${firstName.trim()} ${lastName.trim()}`);
        setIsSignUp(false); 
        setPassword(""); 
      } else {
        toast.error(res.error || "An account with this name already exists.");
      }
    } else {
      if (!fullName.trim() || !password) {
          toast.error("Please provide your Full Name and Password.");
          return;
      }
      
      const nameParts = fullName.trim().split(" ");
      const first = nameParts[0];
      const last = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
      
      const res = auth.login(first, last, password, selectedRole);

      if (res.success && res.user) {
        toast.success(`Welcome back, ${res.user.firstName}!`);
        
        if (selectedRole === 'admin') {
            navigate("/admin");
        } else if (selectedRole === 'art-manager') {
            navigate("/manager");
        } else {
            // Check if the employee is an APPROVED Scrum Master to route to special dashboard
            // If they are pending, they must go to /home to see the Waiting Room
            if (res.user.jobTitle === 'Scrum Master' && res.user.status === 'approved' && res.user.teamId) {
                navigate("/scrum-master");
            } else {
                navigate("/home");
            }
        }
      } else {
        if (res.error === 'Account pending') {
            toast.error("Approval Pending: Waiting for an administrator to accept your request.", {
                icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
                duration: 5000
            });
        } else {
            toast.error(res.error || "Invalid credentials.");
        }
      }
    }
  };

  const getRoleTitle = () => {
    if (selectedRole === 'admin') return 'Admin Portal';
    if (selectedRole === 'art-manager') return 'Manager Portal';
    return 'Employee Portal';
  };

  const loadDummyData = () => {
      auth.signup("System", "Admin", "admin123", "admin");
      auth.signup("Tech", "Lead", "password123", "art-manager");
      auth.signup("John", "Doe", "password123", "employee", "Front-end Developer"); // Remains pending so you can test onboarding!
      toast.success("System primed with default accounts.");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative font-sans overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse" style={{ animationDelay: '2s' }}></div>
      
      <div className="w-full relative z-10 flex flex-col items-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0A1128] text-white mb-6 shadow-xl shadow-[#0A1128]/20 transition-transform hover:scale-105 hover:rotate-3 duration-300">
            <BadgeCheck className="w-8 h-8" />
          </div>
          <h1 
            className="text-4xl font-extrabold text-slate-900 tracking-tight cursor-pointer"
            onDoubleClick={() => setShowAdminKey(true)}
          >
            <span className="text-[#0A1128]">Elevate</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Enterprise Recognition Platform</p>
        </div>

        {!selectedRole ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card 
                className="hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group bg-white/90 backdrop-blur-xl border-0 shadow-lg"
                onClick={() => setSelectedRole('employee')}
            >
                <CardContent className="p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors text-blue-600 shadow-sm">
                        <Users className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Employee</h3>
                    <p className="text-sm text-slate-500">Nominate peers, earn badges, and view leaderboards.</p>
                </CardContent>
            </Card>

            <Card 
                className="hover:shadow-xl hover:border-amber-300 transition-all cursor-pointer group bg-white/90 backdrop-blur-xl border-0 shadow-lg"
                onClick={() => setSelectedRole('art-manager')}
            >
                <CardContent className="p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors text-amber-500 shadow-sm">
                        <Train className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Train Manager</h3>
                    <p className="text-sm text-slate-500">Manage teams, approve requests, and control sprints.</p>
                </CardContent>
            </Card>

            <Card 
                className="hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer group bg-white/90 backdrop-blur-xl border-0 shadow-lg"
                onClick={() => setSelectedRole('admin')}
            >
                <CardContent className="p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors text-purple-600 shadow-sm">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Admin</h3>
                    <p className="text-sm text-slate-500">Global oversight, metrics, and ultimate access control.</p>
                </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="w-full max-w-md shadow-2xl border-0 rounded-3xl bg-white/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="relative pb-6 pt-8 px-8 border-b border-slate-100">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute left-4 top-6 text-slate-400 hover:text-slate-600" 
                onClick={() => {
                    if (isSignUp) {
                        setIsSignUp(false);
                    } else {
                        setSelectedRole(null);
                        setPassword("");
                        setFirstName("");
                        setLastName("");
                        setFullName("");
                        setJobTitle("");
                    }
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <CardTitle className="text-2xl text-center text-slate-900 font-bold">
                {isSignUp ? "Create Account" : getRoleTitle()}
              </CardTitle>
              <CardDescription className="text-center text-base mt-1 text-slate-500 font-medium">
                {isSignUp ? "Submit your details to join." : "Sign in with your credentials."}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-8 pt-8 pb-8">
              <form onSubmit={handleAuth} className="space-y-5">
                
                {isSignUp ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">First Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="John" 
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required 
                          className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] transition-colors rounded-xl font-medium" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Last Name</label>
                      <Input 
                        placeholder="Doe" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required 
                        className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] transition-colors rounded-xl font-medium" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="John Doe" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required 
                        className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] transition-colors rounded-xl font-medium" 
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] transition-colors rounded-xl font-medium" 
                    />
                  </div>
                </div>

                {isSignUp && selectedRole === 'employee' && (
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Job Title / Role</label>
                      <select 
                          className="flex h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0A1128] focus:bg-white transition-colors outline-none font-medium cursor-pointer"
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          required
                      >
                          <option value="" disabled>Select your role...</option>
                          {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                )}

                {isSignUp && selectedRole === 'admin' && showAdminKey && (
                    <div className="space-y-2 p-4 bg-purple-50 rounded-xl border border-purple-100 animate-in fade-in zoom-in-95 duration-300">
                      <label className="text-xs font-bold text-purple-700 uppercase tracking-widest flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5" /> Admin Setup Key
                      </label>
                      <Input 
                        type="password" 
                        placeholder="Enter organizational key" 
                        value={adminKey}
                        onChange={(e) => setAdminKey(e.target.value)}
                        className="h-11 bg-white border-purple-200 focus:border-purple-500 rounded-lg font-medium" 
                      />
                      <p className="text-[10px] text-purple-500 font-medium mt-1">Required to initialize new administrative accounts.</p>
                    </div>
                )}
                
                {isSignUp ? (
                   <>
                      <Button type="submit" className="w-full h-12 bg-[#0A1128] hover:bg-[#141E3C] text-white rounded-xl font-bold text-base shadow-lg shadow-[#0A1128]/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 mt-4">
                          Create Account
                      </Button>
                      <div className="text-center mt-4 pt-2 space-y-2">
                          <p className="text-sm text-slate-500">
                            Already have an account? <button type="button" onClick={() => { setIsSignUp(false); setPassword(""); }} className="text-[#0A1128] font-semibold hover:underline">Sign In</button>
                          </p>
                      </div>
                   </>
                ) : (
                   <>
                      <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-base shadow-lg shadow-slate-900/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 mt-4 flex items-center justify-center gap-2 transition-all">
                        Sign In <ArrowRight className="w-4 h-4" />
                      </Button>

                      <div className="text-center mt-6">
                          <p className="text-sm text-slate-500">
                            No Account? <button type="button" onClick={() => { setIsSignUp(true); setPassword(""); }} className="text-indigo-600 font-semibold hover:underline">Create Here</button>
                          </p>
                      </div>
                   </>
                )}
                
              </form>
            </CardContent>
            {/* Added for testing convenience */}
            {isSignUp && (
              <CardFooter className="flex flex-col border-t border-slate-100 pt-6 pb-6 px-8 bg-slate-50/50 rounded-b-3xl">
                 <button 
                   className="text-xs text-slate-400 hover:text-slate-600 font-semibold flex items-center gap-1.5 transition-colors"
                   onClick={loadDummyData}
                 >
                   <ShieldAlert className="w-3.5 h-3.5" /> Inject Demo Data
                 </button>
              </CardFooter>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default Login;