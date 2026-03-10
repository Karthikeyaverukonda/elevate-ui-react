import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, ShieldAlert, CheckCircle2, ArrowLeft, ArrowRight, Train, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { auth, UserRole } from "@/lib/localStorage";

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

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;

    if (isSignUp) {
      if (!firstName.trim() || !lastName.trim() || !password) {
          toast.error("Please fill in all fields.");
          return;
      }
      const res = auth.signup(firstName.trim(), lastName.trim(), password, selectedRole);
      if (res.success) {
        toast.success(selectedRole === 'admin' ? "Admin Account Created!" : "Request submitted! Please wait for approval.", {
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
        });
        setFullName(`${firstName.trim()} ${lastName.trim()}`);
        setIsSignUp(false); 
        setPassword(""); 
      } else {
        toast.error(res.error);
      }
    } else {
      let res;
      if (selectedRole === 'admin') {
          if (!firstName.trim() || !lastName.trim() || !password) {
              toast.error("Please provide First Name, Last Name and Password.");
              return;
          }
          res = auth.login(firstName.trim(), lastName.trim(), password, selectedRole);
      } else {
          if (!fullName.trim() || !password) {
              toast.error("Please provide your Full Name and Password.");
              return;
          }
          const nameParts = fullName.trim().split(" ");
          const first = nameParts[0];
          const last = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
          res = auth.login(first, last, password, selectedRole);
      }

      if (res.success) {
        toast.success("Welcome back!");
        if (selectedRole === 'admin') navigate("/admin");
        else if (selectedRole === 'art-manager') navigate("/manager");
        else navigate("/home");
      } else {
        if (res.error === 'Account pending') {
            toast.error("Approval Pending", {
                description: "Waiting for your Train Manager to accept your request.",
                icon: <Clock className="w-5 h-5 text-amber-500" />,
                duration: 5000
            });
        } else if (res.error === 'Account is not active. Please contact the administrator.') {
            toast.error("Account Disabled", {
                description: "Your account is not active. Please contact the administrator.",
                icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
                duration: 5000
            });
        } else {
            toast.error(res.error);
        }
      }
    }
  };

  const getRoleTitle = () => {
    if (selectedRole === 'admin') return 'Admin Portal';
    if (selectedRole === 'art-manager') return 'Manager Portal';
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
                onClick={() => setSelectedRole('employee')}
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
                onClick={() => setSelectedRole('art-manager')}
            >
                <CardContent className="p-8 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors text-purple-600">
                        <Train className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Train Manager</h3>
                    <p className="text-sm text-slate-500">Manage teams, approve requests, and control sprints.</p>
                </CardContent>
            </Card>

            <Card 
                className="hover:shadow-xl hover:border-slate-400 transition-all cursor-pointer group bg-white/95 backdrop-blur-sm"
                onClick={() => setSelectedRole('admin')}
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
                
                {isSignUp || (!isSignUp && selectedRole === 'admin') ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">First Name</label>
                      <Input placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="h-11 border-slate-200" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-800">Last Name</label>
                      <Input placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="h-11 border-slate-200" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800">Full Name</label>
                    <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="h-11 border-slate-200" />
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
                          <p className="text-sm font-bold text-slate-800">Request Access</p>
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
                            No Account? <button type="button" onClick={() => { setIsSignUp(true); setPassword(""); }} className="text-indigo-600 font-semibold hover:underline">Create Here</button>
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

import { Clock as ClockIcon } from 'lucide-react';
const FixedLogin = () => {
    return <Login />
}

export default Login;