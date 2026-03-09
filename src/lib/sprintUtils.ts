import { sprintStorage } from "@/lib/localStorage";

export interface Sprint {
  id: string; 
  label: string;
  title?: string;
  startDate: Date;
  endDate: Date;
  status?: 'active' | 'completed' | 'locked';
}

export const getSprintList = (): Sprint[] => {
  const storedSprints = sprintStorage.getSprints();
  
  if (!storedSprints || storedSprints.length === 0) {
    return []; 
  }

  return storedSprints.map(s => {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    const today = new Date();
    
    let status = s.status;
    if (today < start) status = 'locked';
    else if (today >= start && today <= end) status = 'active';
    else if (today > end) status = 'completed';

    return {
      id: s.id,
      title: s.title,
      label: s.title,
      startDate: start,
      endDate: end,
      status: status
    };
  });
};