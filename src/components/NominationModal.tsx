import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { auth, nominationStorage, sprintStorage } from "@/lib/localStorage";
import { toast } from "sonner";
import { Employee, AwardType } from "@/types/employee";
import { X, Send, AlertTriangle, Info, Ban } from "lucide-react";

interface NominationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  awardType: AwardType | null;
}

export const NominationModal = ({ isOpen, onClose, employee, awardType }: NominationModalProps) => {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentUser = auth.getCurrentUser();

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setComment("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // 1. Calculate Sprint Constraints
  const sprints = sprintStorage.getSprints();
  const activeSprint = sprints.find(s => s.status === 'active');
  const allNoms = nominationStorage.getNominations();

  // 2. Calculate remaining votes for this specific user pair
  const currentCount = (currentUser && employee) ? nominationStorage.getNominationCountBetweenUsers(currentUser.id, employee.id) : 0;
  const remainingVotes = Math.max(0, 5 - currentCount);

  // 3. Check if the logged-in user has ALREADY used this specific Award Type in the active sprint
  let hasUsedAward = false;
  if (currentUser && awardType && activeSprint) {
      const sprintStart = new Date(activeSprint.startDate).setHours(0,0,0,0);
      const sprintEnd = new Date(activeSprint.endDate).setHours(23,59,59,999);
      
      hasUsedAward = allNoms.some(n =>
          n.nominatorId === currentUser.id &&
          n.awardType === awardType &&
          new Date(n.timestamp).getTime() >= sprintStart &&
          new Date(n.timestamp).getTime() <= sprintEnd
      );
  }

  const handleSubmit = () => {
    if (!currentUser || !employee || !awardType) return;
    if (!comment.trim()) {
      toast.error("Please add a reason for the nomination.");
      return;
    }
    
    if (remainingVotes <= 0) {
        toast.error(`Limit Reached: You have no votes left for ${employee.name}!`);
        return;
    }

    if (hasUsedAward) {
        toast.error(`You have already used the "${awardType}" award in this sprint!`);
        return;
    }

    setIsSubmitting(true);
    
    try {
        nominationStorage.addNomination(employee.id, currentUser.id, awardType as string, comment, 5); 
        toast.success(`Vote cast successfully! You have recognized ${employee.name}.`);
        onClose();
    } catch (error) {
        toast.error("System error. Failed to submit nomination.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (!isOpen || !employee || !awardType) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-slate-200">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-xl font-bold uppercase shadow-sm">
                        {employee.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 leading-tight">Recognize {employee.name}</h2>
                        <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{awardType}</p>
                    </div>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors self-start">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                
                {hasUsedAward ? (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-red-700 text-sm font-medium">
                        <Ban className="w-5 h-5 shrink-0" />
                        <p>You have already used your <strong>{awardType}</strong> award during this sprint! You must select a different award to recognize a peer.</p>
                    </div>
                ) : remainingVotes <= 0 ? (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-red-700 text-sm font-medium">
                        <Ban className="w-5 h-5 shrink-0" />
                        <p>You have 0 votes left for this person. You can only nominate a specific peer a maximum of 5 times.</p>
                    </div>
                ) : (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3 text-indigo-700 text-sm font-medium">
                        <Info className="w-5 h-5 shrink-0" />
                        <p>You have <strong>{remainingVotes} vote{remainingVotes !== 1 ? 's' : ''} left</strong> for this person. Make it count by providing a meaningful reason!</p>
                    </div>
                )}

                <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700">Reason for Nomination</label>
                    <Textarea 
                        placeholder="e.g., John went above and beyond to help me debug the critical deployment issue this week..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        disabled={hasUsedAward || remainingVotes <= 0}
                        className="min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0A1128] text-sm resize-none rounded-xl p-4 shadow-inner disabled:opacity-50"
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} className="h-11 px-6 rounded-xl font-bold text-slate-600 hover:bg-slate-100 border-slate-200">
                    Cancel
                </Button>
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !comment.trim() || hasUsedAward || remainingVotes <= 0} 
                    className="h-11 px-6 rounded-xl font-bold bg-[#0A1128] hover:bg-[#141E3C] text-white shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                    {isSubmitting ? 'Submitting...' : <>Submit Vote <Send className="w-4 h-4"/></>}
                </Button>
            </div>

        </div>
    </div>
  );
};