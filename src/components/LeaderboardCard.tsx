import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Employee, Badge as BadgeType } from "@/types/employee";
import { Star } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { awardStorage } from "@/lib/localStorage";

interface LeaderboardCardProps {
  employee: Employee;
  rank: number;
  onBadgeClick: (badge: BadgeType, employeeId: string) => void;
}

export const LeaderboardCard = ({ employee, rank, onBadgeClick }: LeaderboardCardProps) => {
  const isTopThree = rank <= 3;
  const systemAwards = awardStorage.getAwards(); // Dynamically fetch

  return (
    <Card className={`hover-lift overflow-hidden transition-all duration-300 ${isTopThree ? "border-primary/50 shadow-lg" : "border-slate-200"}`}>
      <CardContent className="p-4 sm:p-6 flex items-center gap-4">
        {/* Rank */}
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${
            isTopThree ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md" : "bg-slate-100 text-slate-600"
          }`}
        >
          {rank}
        </div>

        {/* Avatar & Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className={`w-12 h-12 sm:w-14 sm:h-14 border-2 ${isTopThree ? "border-indigo-100" : "border-white"}`}>
            <AvatarImage src={employee.profilePicture} alt={employee.name} />
            <AvatarFallback>{employee.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg truncate">{employee.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{employee.jobTitle}</p>
          </div>
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <div className="flex items-center justify-end gap-1 text-lg sm:text-xl font-bold text-slate-900">
            <Star className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500" />
            {employee.totalScore}
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Points</p>
        </div>
      </CardContent>
      
      {/* Badges Row */}
      {employee.badges.length > 0 && (
        <div className="px-4 sm:px-6 pb-4 flex flex-wrap gap-2">
          {employee.badges.map((badge) => {
            const category = systemAwards.find((c) => c.type === badge.type);
            const IconComponent = category && category.icon
              ? (LucideIcons[category.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>)
              : (LucideIcons.Award as React.ComponentType<{ className?: string }>);

            return (
              <button
                key={badge.id}
                onClick={() => onBadgeClick(badge, employee.id)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-colors hover:bg-slate-50"
                style={{
                  borderColor: category?.color ? `${category.color}40` : "#f59e0b40",
                  color: category?.color || "#f59e0b",
                }}
              >
                {IconComponent && <IconComponent className="w-3 h-3" />}
                <span className="truncate max-w-[100px]">{badge.type}</span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};