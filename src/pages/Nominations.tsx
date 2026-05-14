import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { NominationsStorage, awardStorage, UserStorage, sprintStorage } from "@/lib/ApiStorage";
import {
  Award,
  FetUsersCurrentSprintNomiationDataResponse,
  TeamMemberDataForNominations,
  STORAGE_KEYS,
} from "@/data/models/Interfaces";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Trophy, Users, UserCheck, Star, CheckCircle2 } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const Nominations = () => {
  const navigate = useNavigate();

  const [nominationData, setNominationData] = useState<FetUsersCurrentSprintNomiationDataResponse | null>(null);
  const [awards, setAwards] = useState<Award[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<TeamMemberDataForNominations | null>(null);
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [comments, setComments] = useState("");
  const [currentUserEmployeeId, setCurrentUserEmployeeId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [activeSprint, setActiveSprint] = useState<{ sprint_id: string; sprint_name: string } | null>(null);

  const loadData = useCallback(async () => {
    const [nomData, awardsData, userDetails, sprintData] = await Promise.all([
      NominationsStorage.getUsersCurrentSprintNomiationData(),
      awardStorage.getAwards(),
      UserStorage.getCurrentUserDetails(),
      sprintStorage.getActiveSprintForART(),
    ]);
    if (nomData) setNominationData(nomData);
    if (awardsData) setAwards(awardsData);
    if (userDetails) setCurrentUserEmployeeId(userDetails.employee_id);
    if (sprintData) setActiveSprint(sprintData);
  }, []);

  useEffect(() => {
    const role = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE);
    if (role === "Admin") { navigate("/admin"); return; }
    if (role === "Art Manager") { navigate("/manager"); return; }
    loadData();
  }, [navigate, loadData]);

  const isAwardUsed = (award: Award) =>
    nominationData?.awards_already_used?.some((a) => a.award_id === award.award_id) ?? false;

  const validateComment = (value: string) => {
    const stripped = value.replace(/[^a-zA-Z0-9\s]/g, "").trim();
    if (!stripped) return "Comment is required.";
    if (stripped.length < 10) return `Comment must have at least 10 characters (currently ${stripped.length}).`;

    // Must contain at least 2 words
    const words = stripped.split(/\s+/).filter(Boolean);
    if (words.length < 2) return "Comment must contain at least 2 words.";

    // No 4+ consecutive identical characters (e.g. "aaaa", "1111")
    if (/(.)\1{3,}/.test(stripped)) return "Comment appears to contain repeated characters. Please write a meaningful comment.";

    // No keyboard row walks of 5+ characters
    const keyboardRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "poiuytrewq", "lkjhgfdsa", "mnbvcxz"];
    const lower = stripped.toLowerCase();
    for (const row of keyboardRows) {
      for (let i = 0; i <= row.length - 5; i++) {
        if (lower.includes(row.slice(i, i + 5))) return "Comment appears to be a keyboard sequence. Please write a meaningful comment.";
      }
    }

    // Must have at least 5 unique alphanumeric characters
    const uniqueChars = new Set(stripped.toLowerCase().replace(/\s/g, "").split(""));
    if (uniqueChars.size < 5) return "Comment lacks variety. Please write a more descriptive comment.";

    return "";
  };

  const handleSubmit = async () => {
    const error = validateComment(comments);
    if (error) { setCommentError(error); return; }
    if (!selectedEmployee) { toast.error("Please select a teammate to nominate."); return; }
    if (!selectedAward) { toast.error("Please select an award."); return; }
    if (!currentUserEmployeeId) { toast.error("Could not identify your employee profile. Please reload the page."); return; }
    const sprintId = activeSprint?.sprint_id ?? nominationData?.sprint_id;
    if (!sprintId) { toast.error("No active sprint found. Please contact your ART Manager."); return; }
    setIsSubmitting(true);
    const result = await NominationsStorage.postNomination(
      currentUserEmployeeId,
      selectedEmployee.employee_id,
      selectedAward.award_id,
      sprintId,
      comments
    );
    if (result) {
      toast.success("Nomination submitted successfully!");
      setSelectedEmployee(null);
      setSelectedAward(null);
      setComments("");
      setCommentError("");
      setShowConfirmDialog(false);
      loadData();
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-slate-200 px-8 py-5 mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/home")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Nominate a Teammate</h1>
          {nominationData?.sprint_name && (
            <p className="text-sm font-semibold text-indigo-600 mt-0.5">
              Sprint: {nominationData.sprint_name}
            </p>
          )}
        </div>
        {/* spacer to keep header centered */}
        <div className="w-24" />
      </div>

      {/* Main Content */}
      <div className="px-8 pb-8 flex gap-6 items-start">
        {/* Left: Employee Sections */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Section 1: My Team Members */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <UserCheck className="h-5 w-5 text-indigo-500" />
                My Team Members
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {nominationData?.user_team_members?.length ?? 0} members
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nominationData?.user_team_members?.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {nominationData.user_team_members.map((emp) => {
                    const isSelected = selectedEmployee?.employee_id === emp.employee_id;
                    return (
                      <div
                        key={emp.employee_id}
                        onClick={() => setSelectedEmployee(isSelected ? null : emp)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${isSelected
                            ? "bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300 shadow-md"
                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                          }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={emp.employee_image ? BASE_URL + emp.employee_image : "/placeholder.svg"}
                            alt={emp.employee_name}
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow"
                          />
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-indigo-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${isSelected ? "text-indigo-800" : "text-slate-800"}`}>
                            {emp.employee_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{emp.employee_role}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.team_name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No team members found.</p>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Other Team Members */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <Users className="h-5 w-5 text-violet-500" />
                Other Team Members
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {nominationData?.other_team_members?.length ?? 0} members
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nominationData?.other_team_members?.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {nominationData.other_team_members.map((emp) => {
                    const isSelected = selectedEmployee?.employee_id === emp.employee_id;
                    return (
                      <div
                        key={emp.employee_id}
                        onClick={() => setSelectedEmployee(isSelected ? null : emp)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${isSelected
                            ? "bg-violet-50 border-violet-400 ring-2 ring-violet-300 shadow-md"
                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                          }`}
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={emp.employee_image ? BASE_URL + emp.employee_image : "/placeholder.svg"}
                            alt={emp.employee_name}
                            className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow"
                          />
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-violet-600 absolute -bottom-1 -right-1 bg-white rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm truncate ${isSelected ? "text-violet-800" : "text-slate-800"}`}>
                            {emp.employee_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{emp.employee_role}</p>
                          <p className="text-xs text-muted-foreground truncate">{emp.team_name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No other team members found.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Section 3 — Awards + Submission */}
        <div className="w-80 flex-shrink-0 space-y-4 sticky top-6">
          {/* Awards Panel */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <Trophy className="h-5 w-5 text-amber-500" />
                Select Award
              </CardTitle>
              {nominationData?.awards_already_used?.length ? (
                <p className="text-xs text-muted-foreground">
                  Blurred awards have already been used this sprint.
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {awards.length > 0 ? awards.map((award) => {
                const used = isAwardUsed(award);
                const isSelected = selectedAward?.award_id === award.award_id;
                const inner = (
                  <div
                    key={award.award_id}
                    onClick={() => { if (!used) setSelectedAward(isSelected ? null : award); }}
                    className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-150 ${used
                        ? "opacity-40 blur-[2px] cursor-not-allowed border-slate-200 bg-slate-50 pointer-events-none"
                        : isSelected
                          ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-md cursor-pointer"
                          : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 cursor-pointer shadow-sm"
                      }`}
                  >
                    <img
                      src={award.award_image ? BASE_URL + award.award_image : "/placeholder.svg"}
                      alt={award.award_name}
                      className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm truncate ${isSelected && !used ? "text-amber-800" : "text-slate-800"}`}>
                        {award.award_name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{award.award_description}</p>
                    </div>
                    {isSelected && !used && (
                      <CheckCircle2 className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    )}
                    {used && (
                      <span className="absolute top-1.5 right-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Used</span>
                    )}
                  </div>
                );

                return used ? (
                  <div key={award.award_id} className="relative group">
                    {inner}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <span className="bg-slate-800/80 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg">
                        You have already used this award
                      </span>
                    </div>
                  </div>
                ) : inner;
              }) : (
                <p className="text-sm text-muted-foreground text-center py-6">No awards available.</p>
              )}
            </CardContent>
          </Card>

          {/* Confirm button shown when both are selected */}
          {selectedEmployee && selectedAward ? (
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={() => { setCommentError(""); setShowConfirmDialog(true); }}
            >
              <Star className="h-4 w-4 mr-2" />
              Confirm Nomination
            </Button>
          ) : (
            <p className="text-xs text-center text-muted-foreground px-2">
              {!selectedEmployee && !selectedAward
                ? "Select a teammate and an award to nominate."
                : !selectedEmployee
                  ? "Select a teammate to nominate."
                  : "Select an award to continue."}
            </p>
          )}
        </div>
      </div>

      {/* Confirm Nomination Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={(open) => { setShowConfirmDialog(open); if (!open) setCommentError(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-700">
              <Star className="h-5 w-5" />Confirm Nomination
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              {selectedEmployee && (
                <img
                  src={selectedEmployee.employee_image ? BASE_URL + selectedEmployee.employee_image : "/placeholder.svg"}
                  alt={selectedEmployee.employee_name}
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-300 flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{selectedEmployee?.employee_name}</p>
                <p className="text-xs text-muted-foreground truncate">{selectedEmployee?.employee_role} · {selectedEmployee?.team_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              {selectedAward && (
                <img
                  src={selectedAward.award_image ? BASE_URL + selectedAward.award_image : "/placeholder.svg"}
                  alt={selectedAward.award_name}
                  className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800 truncate">{selectedAward?.award_name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{selectedAward?.award_description}</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Comment <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-muted-foreground">(min 10 characters)</span>
              </label>
              <Textarea
                placeholder="Write a meaningful comment about why you're nominating this person..."
                value={comments}
                onChange={(e) => { setComments(e.target.value); if (commentError) setCommentError(validateComment(e.target.value)); }}
                className={`text-sm resize-none ${commentError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                rows={4}
              />
              {commentError && (
                <p className="text-xs text-red-500">{commentError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConfirmDialog(false); setCommentError(""); }}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Nomination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Nominations;
