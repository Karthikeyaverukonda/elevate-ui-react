import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Employee, AwardType } from "@/types/employee";
import { Star, Send, Lock } from "lucide-react";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import { auth, nominationStorage, awardStorage } from "@/lib/localStorage";

interface NominationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  awardType: AwardType | null;
}

export const NominationModal = ({
  isOpen,
  onClose,
  employee,
  awardType,
}: NominationModalProps) => {
  const rating = 5; 
  const [comment, setComment] = useState("");
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);

  useEffect(() => {
    if (isOpen && awardType) {
      const user = auth.getCurrentUser();
      if (user) {
        const alreadyVoted = nominationStorage.hasUserNominatedForAward(user.id, awardType);
        setHasAlreadyVoted(alreadyVoted);
      }
    }
  }, [isOpen, awardType]);

  if (!employee || !awardType) return null;

  // Dynamic fetch instead of mockData
  const systemAwards = awardStorage.getAwards();
  const category = systemAwards.find((c) => c.type === awardType);
  
  // Safe fallback if icon doesn't exist dynamically
  const IconComponent = category && category.icon
    ? (LucideIcons[category.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>)
    : (LucideIcons.Award as React.ComponentType<{ className?: string }>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = auth.getCurrentUser();
    
    if (!user) {
      toast.error("You must be logged in to nominate");
      return;
    }

    if (nominationStorage.hasUserNominatedForAward(user.id, awardType)) {
      toast.error(`You have already cast a vote for ${awardType}`);
      return;
    }

    nominationStorage.addNomination(
      employee.id,
      user.id,
      awardType,
      comment,
      rating
    );

    toast.success(`Nomination sent to ${employee.name}!`, {
      description: `${awardType} • ${rating} stars applied`,
    });
    
    setComment("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {IconComponent && (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: category?.color || "#f59e0b" }}
              >
                <IconComponent className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <DialogTitle>Nominate {employee.name}</DialogTitle>
              <DialogDescription>{awardType}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {hasAlreadyVoted ? (
          <div className="py-8 flex flex-col items-center text-center space-y-4">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
               <Lock className="w-8 h-8 text-gray-400" />
             </div>
             <div>
               <h3 className="text-lg font-semibold text-gray-900">Vote Already Cast</h3>
               <p className="text-sm text-gray-500 max-w-xs mx-auto mt-2">
                 You have already used your nomination for the <strong>{awardType}</strong> category. You cannot nominate another person for this award.
               </p>
             </div>
             <Button variant="outline" onClick={onClose} className="mt-4">
               Close
             </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex flex-col items-center justify-center space-y-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                Recognition Level
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-8 h-8 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>
              <p className="text-sm text-amber-600 font-medium">
                Highest Honor (5 Stars)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Why do they deserve this?</Label>
              <Textarea
                id="comment"
                placeholder="Share a specific example of their work..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white gap-2">
                <Send className="w-4 h-4" />
                Send Nomination
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};