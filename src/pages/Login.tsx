import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, CheckCircle2, ArrowLeft, ArrowRight, Train, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { UserRole } from "@/data/models/Interfaces";

const Login = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>();
  const [userDesignation, setUserDesignation] = useState("");
  const [userLogin, setUserLogin] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userImage, setUserImage] = useState<File | null>(null);
  const [password, setPassword] = useState("");


  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim() || !password || (selectedRole === 'Employee' && !userDesignation) || !userLogin.trim()) {
        toast.error("Please fill in all fields.");
        return;
      }
      var user_role = "";
      // Prepare signup data
      if (selectedRole == "Employee") {
        user_role = userDesignation
      }
      else {
        user_role = selectedRole
      }
      const signupData = new FormData();
      signupData.append('user_firstname', firstName.trim());
      signupData.append('user_lastname', lastName.trim());
      signupData.append('user_login', userLogin.trim());
      signupData.append('password', password);
      signupData.append('user_role', user_role);
      if (userImage) {
        signupData.append('image', userImage);
      }

      fetch('http://127.0.0.1:8000/api/signup/', {
        method: 'POST',
        body: signupData,
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Signup failed');
          }
          return response.json();
        })
        .then(() => {
          toast.success(selectedRole === 'Admin' || selectedRole === 'Art Manager' ? "Account Created!" : "Request submitted! Please wait for approval.", {
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
          });
          setIsSignUp(false);
          setPassword("");
        })
        .catch((err: any) => {
          toast.error(err.message || 'Signup failed');
        });
    } else {
      if (!userLogin.trim() || !password) {
        toast.error("Please provide your Login and Password.");
        return;
      }
      var user_role = "";
      // Prepare signup data
      if (selectedRole == "Employee") {
        user_role = "Employee"
      }
      else {
        user_role = selectedRole
      }
      // Login API call
      fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_login: userLogin.trim(),
          password: password,
          user_role: user_role
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Invalid credentials');
          }
          return response.json();
        })
        .then((data) => {
          // Check if user account is inactive
          if (data.user && data.user.is_active === false) {
            toast.error("Your account is not active. Contact the administration to make it active");
            setUserLogin("");
            setPassword("");
            return;
          }

          // Store tokens in sessionStorage (per-tab isolation)
          if (data.access_token) {
            sessionStorage.setItem('access_token', data.access_token);
          }
          if (data.refresh_token) {
            sessionStorage.setItem('refresh_token', data.refresh_token);
          }
          if (data.user && data.user.user_id) {
            sessionStorage.setItem('user_id', data.user.user_id);
          }
          if (data.user && data.user.user_login) {
            sessionStorage.setItem('user_login', data.user.user_login);
          }
          if (data.user && data.user.user_role) {
            sessionStorage.setItem('user_role', data.user.user_role);
          }
          toast.success("Welcome back!");
          // Use user.user_role or user_login if available from API response for role-based navigation
          let userRole = selectedRole;
          if (data.user && data.user.user_role) {
            userRole = data.user.user_role;
          }
          if (data.user && data.user.art_id) {
            sessionStorage.setItem('art_id', data.user.art_id);
}
          // Normalize for navigation
          if (userRole === 'Admin') {
            console.log("Navigating to admin dashboard for Admin role");
            navigate("/admin");
          } else if (userRole === 'Art Manager') {
            console.log("Navigating to manager dashboard for Art Manager role");
            navigate("/manager");
          } else {
            // Check if the employee is an APPROVED Scrum Master to route to special dashboard
            // If they are pending, they must go to /home to see the Waiting Room
            if (userRole === 'Scrum Master') {
              console.log("Navigating to scrum master dashboard for Scrum Master role");
              navigate("/home");
            } else {
              console.log("Navigating to home for Employee role");
              navigate("/home");
            }
          }
        })
        .catch((err: any) => {
          toast.error(err.message || 'Invalid credentials');
        });
    }
  };

  const getRoleTitle = () => {
    if (selectedRole === 'Admin') return 'Admin Portal';
    if (selectedRole === 'Art Manager') return 'ART Manager Portal';
    return 'Employee Portal';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">

      <div className="absolute top-0 left-0 w-full h-[400px] bg-gradient-to-br from-indigo-50 via-white to-purple-50 z-0" />

      <div className="w-full relative z-10 flex flex-col items-center">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 text-white shadow-lg mb-4">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Elevate</h1>
          <p className="text-slate-500 text-sm">The Employee Recognition Platform</p>
        </div>

        {!selectedRole ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card
              className="hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer group bg-white/95 backdrop-blur-sm"
              onClick={() => setSelectedRole('Employee')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors text-indigo-600">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Employee</h3>
                <p className="text-sm text-slate-500">Nominate peers, earn badges, and view leaderboards.</p>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer group bg-white/95 backdrop-blur-sm"
              onClick={() => setSelectedRole('Art Manager')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors text-purple-600">
                  <Train className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Release Train Manager</h3>
                <p className="text-sm text-slate-500">Manage teams, approve requests, and control sprints.</p>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-xl hover:border-slate-400 transition-all cursor-pointer group bg-white/95 backdrop-blur-sm"
              onClick={() => setSelectedRole('Admin')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-slate-800 group-hover:text-white transition-colors text-slate-600">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">System Admin</h3>
                <p className="text-sm text-slate-500">Global oversight, metrics, and ultimate access control.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="w-full max-w-md shadow-2xl border-0 rounded-3xl bg-white animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="relative pb-4 pt-8">

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
                  }
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>

              <CardTitle className="text-2xl text-center text-slate-900 font-bold">
                {isSignUp ? "Create Account" : getRoleTitle()}
              </CardTitle>
              <CardDescription className="text-center text-sm mt-1 text-slate-500">
                {isSignUp ? "Submit your details to join." : "Sign in with your credentials."}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              <form onSubmit={handleAuth} className="space-y-4">

                {isSignUp ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">First Name</label>
                      <Input placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-11 border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">Last Name</label>
                      <Input placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="h-11 border-slate-200" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-slate-800">User Login/User Name</label>
                      <Input placeholder="John Doe" value={userLogin} onChange={(e) => setUserLogin(e.target.value)} required className="h-11 border-slate-200" />
                    </div>
                    {/* Show Designation only if selectedRole is 'Employee' */}
                    {selectedRole === 'Employee' && (
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-bold text-slate-800">Designation</label>
                        <div className="relative">
                          <select
                            value={userDesignation}
                            onChange={(e) => setUserDesignation(e.target.value)}
                            required
                            className="h-11 border border-slate-200 w-full rounded-lg px-4 py-2 pr-10 bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all appearance-none"
                          >
                            <option value="" disabled>Select Designation</option>
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
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-slate-800">Profile Image</label>
                      <Input className="h-11 border-slate-200 w-full rounded-lg px-4 py-2 bg-white text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        type="file"
                        accept=".jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
                              toast.error("Invalid file type. Please upload a .jpg, .jpeg, or .png image.");
                              e.target.value = "";
                            } else if (file.size > 5 * 1024 * 1024) {
                              toast.error("File size exceeds 5MB limit. Please upload a smaller image.");
                              e.target.value = "";
                            } else {
                              setUserImage(file);
                              toast.success("Profile image selected: " + file.name);
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">User Login/User Name</label>
                    <Input placeholder="John Doe" value={userLogin} onChange={(e) => setUserLogin(e.target.value)} required className="h-11 border-slate-200" />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Password</label>
                  <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-11 border-slate-200" />
                </div>

                {isSignUp ? (
                  <>
                    <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md py-6 mt-2 rounded-xl text-md font-bold">
                      Create Account
                    </Button>
                    <div className="text-center mt-4 pt-2 space-y-2">
                      <p className="text-sm text-slate-500">
                        Already have an account? <button type="button" onClick={() => { setIsSignUp(false); setPassword(""); }} className="text-indigo-600 font-semibold hover:underline">Sign In</button>
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md py-6 mt-2 rounded-xl text-md font-bold flex items-center justify-center gap-2 transition-all">
                      Sign In <ArrowRight className="w-4 h-4" />
                    </Button>

                    <div className="text-center mt-6">
                      <p className="text-sm text-slate-500">
                        No Account? <button type="button" onClick={() => { setIsSignUp(true); setPassword(""); setUserLogin("") }} className="text-indigo-600 font-semibold hover:underline">Create Here</button>
                      </p>
                    </div>
                  </>
                )}

              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Login;