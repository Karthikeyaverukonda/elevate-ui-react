import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Badge as BadgeType } from "@/types/employee";
import { Star, Calendar, User } from "lucide-react";
import { awardCategories } from "@/data/mockData";
import * as LucideIcons from "lucide-react";
import { format } from "date-fns";
import { nominationStorage } from "@/lib/localStorage";
import { toast } from "sonner"; // Import Toast

interface BadgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: BadgeType | null;
  employeeId?: string;
}

export const BadgeDetailModal = ({ isOpen, onClose, badge, employeeId }: BadgeDetailModalProps) => {
  const [voteCount, setVoteCount] = useState(0);

  useEffect(() => {
    const fetchVoteCount = () => {
      if (!badge || !employeeId) return;

      const allNominations = nominationStorage.getNominations();
      const votes = allNominations.filter(
        n => n.nomineeId === employeeId && n.awardType === badge.type
      );

      setVoteCount(votes.length);
    };

    fetchVoteCount();
  }, [badge, employeeId]);

  if (!badge) return null;

  const category = awardCategories.find((c) => c.type === badge.type);
  const IconComponent = category
    ? (LucideIcons[category.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>)
    : null;

  const reactionEmojis = ["👍", "❤️", "🎉"];

  // --- NEW HANDLER ---
  const handleReaction = (emoji: string) => {
    // In a real app, you would save this to the database here.
    toast.success("Reaction sent!", {
      description: `You reacted with ${emoji} to this award.`
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {IconComponent && category && (
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-glow"
                style={{ backgroundColor: category.color }}
              >
                <IconComponent className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <DialogTitle className="text-xl">{badge.type}</DialogTitle>
              <DialogDescription>{category?.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vote Count */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <span className="text-sm font-medium">Total Votes for this Award</span>
            <Badge variant="secondary" className="text-sm font-semibold">
              {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
            </Badge>
          </div>

          {/* Rating */}
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < badge.rating
                    ? "text-accent fill-accent"
                    : "text-muted-foreground"
                }`}
              />
            ))}
          </div>

          {/* Comment */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm italic">&ldquo;{badge.comment}&rdquo;</p>
          </div>

          {/* Metadata */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>
                Given by <span className="font-medium text-foreground">{badge.givenBy}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(badge.timestamp, "MMMM d, yyyy 'at' h:mm a")}</span>
            </div>
          </div>

          {/* Reactions */}
          <div>
            <p className="text-sm font-medium mb-2">Reactions</p>
            <div className="flex gap-2">
              {reactionEmojis.map((emoji) => {
                const count = badge.reactions.filter((r) => r.emoji === emoji).length;
                return (
                  <Button
                    key={emoji}
                    variant="outline"
                    size="sm"
                    className="gap-1 hover-lift active:scale-95 transition-transform"
                    onClick={() => handleReaction(emoji)} // Added Click Handler
                  >
                    <span className="text-lg">{emoji}</span>
                    {count > 0 && <span className="text-xs">{count}</span>}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};