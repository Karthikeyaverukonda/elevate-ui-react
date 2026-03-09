import { Card, CardContent } from "@/components/ui/card";
import { AwardCategory } from "@/types/employee";
import * as LucideIcons from "lucide-react";

interface AwardCategoryCardProps {
  category: AwardCategory;
  onClick?: () => void;
  isSelected?: boolean;
}

export const AwardCategoryCard = ({ category, onClick, isSelected = false }: AwardCategoryCardProps) => {
  const IconComponent = LucideIcons[category.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;

  return (
    <Card 
      className={`hover-lift cursor-pointer group transition-smooth ${
        isSelected ? "border-primary border-2 shadow-card-hover" : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center transition-smooth group-hover:scale-110"
          style={{ backgroundColor: category.color }}
        >
          <IconComponent className="w-8 h-8 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-lg mb-1">{category.type}</h3>
          <p className="text-sm text-muted-foreground">{category.description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
