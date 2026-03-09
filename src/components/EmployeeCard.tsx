import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Employee, AwardType, Badge as BadgeType } from "@/types/employee";
import { Trophy, Users, Lock } from "lucide-react";

interface EmployeeCardProps {
  employee: Employee;
  onNominate: (employee: Employee) => void;
  preselectedAward?: AwardType | null;
  isDisabled?: boolean;
  pastBadges?: BadgeType[];
}

export const EmployeeCard = ({ employee, onNominate, preselectedAward, isDisabled, pastBadges = [] }: EmployeeCardProps) => {
  return (
    <Card className={`hover-lift overflow-hidden border-slate-200 group relative transition-all ${isDisabled ? 'opacity-80' : ''}`}>
      
      {/* BLUR OVERLAY for Self */}
      {isDisabled && (
        <div className="absolute inset-0 z-20 bg-white/40 backdrop-blur-[2px] flex items-center justify-center cursor-not-allowed">
          <div className="bg-slate-800/90 text-white text-xs font-bold py-1.5 px-4 rounded-full flex items-center gap-2 shadow-xl animate-in fade-in zoom-in duration-300">
            <Lock className="w-3 h-3" />
            <span>It's You!</span>
          </div>
        </div>
      )}
      
      <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-200 relative">
        <div className="absolute -bottom-10 left-6">
          <Avatar className="w-20 h-20 border-4 border-white shadow-md">
            <AvatarImage src={employee.profilePicture} alt={employee.name} className="object-cover" />
            <AvatarFallback>{employee.name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
      </div>
      
      <CardContent className="pt-12 pb-4 px-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg text-slate-900">{employee.name}</h3>
            <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full w-fit">
              <Users className="w-3 h-3" />
              {employee.department || "General"}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Badge variant="secondary" className="bg-slate-100 text-slate-600">
            <Trophy className="w-3 h-3 mr-1" />
            {employee.badges.length} Awards (This Sprint)
          </Badge>
        </div>
      </CardContent>
      
      <CardFooter className="bg-slate-50/50 p-4">
        <Button 
          className="w-full bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all font-semibold disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-indigo-600 disabled:cursor-not-allowed"
          onClick={() => onNominate(employee)}
          disabled={isDisabled}
        >
          {isDisabled ? "Can't Nominate Self" : (preselectedAward ? `Nominate for ${preselectedAward}` : "Nominate")}
        </Button>
      </CardFooter>
    </Card>
  );
};