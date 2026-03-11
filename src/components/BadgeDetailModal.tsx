import { useEffect, useState } from "react";
import { X, Trophy, Quote, Star } from "lucide-react";
import { Employee } from "@/types/employee";
import { Badge } from "@/components/ui/badge";
import { awardStorage, StoredAward, nominationStorage, StoredUser, STORAGE_KEYS } from "@/lib/localStorage";

interface BadgeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export const BadgeDetailModal = ({ isOpen, onClose, employee }: BadgeDetailModalProps) => {
  const [systemAwards, setSystemAwards] = useState<StoredAward[]>([]);
  const [detailedNoms, setDetailedNoms] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && employee) {
      // 1. Load the award definitions
      setSystemAwards(awardStorage.getAwards());
      
      // 2. Safely fetch all nominations for this specific employee directly from storage 
      // (This prevents crashes if the parent component forgets to pass the badges array)
      const allNoms = nominationStorage.getNominationsForEmployee(employee.id);
      
      const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
      const allUsers: StoredUser[] = usersStr ? JSON.parse(usersStr) : [];
      
      // 3. Map the giver's actual name to the nomination
      const mappedNoms = allNoms.map(nom => {
          const giver = allUsers.find(u => u.id === nom.nominatorId);
          return {
              ...nom,
              giverName: giver ? `${giver.firstName} ${giver.lastName}` : (nom.givenBy || 'A Peer')
          };
      }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setDetailedNoms(mappedNoms);
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  // Calculate unique badge types received
  const uniqueTypes = Array.from(new Set(detailedNoms.map(n => n.awardType)));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 border border-slate-200">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-2xl font-bold text-xl uppercase shadow-sm overflow-hidden border border-indigo-200">
                    {employee.profilePicture ? (
                        <img src={employee.profilePicture} alt={employee.name} className="w-full h-full object-cover" />
                    ) : (
                        employee.name.charAt(0)
                    )}
                </div>
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{employee.name}</h2>
                    <p className="text-sm font-bold text-slate-500 mt-0.5 uppercase tracking-widest">{employee.jobTitle || 'Team Member'}</p>
                </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full shadow-sm border border-slate-200 transition-colors">
                <X className="w-5 h-5" />
            </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
            {detailedNoms.length === 0 ? (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-sm">
                        <Trophy className="w-10 h-10 text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700">No recognition yet</h3>
                    <p className="text-sm text-slate-500 mt-2">This peer hasn't received any badges... yet!</p>
                </div>
            ) : (
                <div className="space-y-8">
                    
                    {/* SUMMARY PILLS */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Award Summary</h4>
                        <div className="flex flex-wrap gap-2">
                            {uniqueTypes.map(type => {
                                const count = detailedNoms.filter(n => n.awardType === type).length;
                                const awardDef = systemAwards.find(a => a.type === type);
                                return (
                                    <Badge key={type} variant="outline" className="bg-white border-slate-200 shadow-sm px-3 py-1.5 text-sm flex items-center gap-2 rounded-xl">
                                        <span style={{color: awardDef?.color || '#6366f1'}}>★</span>
                                        <span className="font-bold text-slate-700">{type}</span>
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg text-xs font-bold">{count}</span>
                                    </Badge>
                                );
                            })}
                        </div>
                    </div>

                    {/* DETAILED FEED */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Recognition History ({detailedNoms.length})</h4>
                        <div className="space-y-4">
                            {detailedNoms.map((nom, idx) => {
                                const awardDef = systemAwards.find(a => a.type === nom.awardType);
                                return (
                                    <div key={nom.id || idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: awardDef?.color || '#6366f1' }} />
                                        
                                        <div className="flex justify-between items-start mb-3 pl-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 border border-slate-100 shadow-sm" style={{color: awardDef?.color || '#6366f1'}}>
                                                    <Star className="w-5 h-5 fill-current opacity-20" />
                                                    <Star className="w-5 h-5 absolute" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-base">{nom.awardType}</p>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">From <span className="font-bold text-indigo-600">{nom.giverName}</span></p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                                                {new Date(nom.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        </div>

                                        {nom.comment && (
                                            <div className="mt-4 bg-slate-50/80 rounded-xl p-4 text-sm text-slate-700 font-medium relative border border-slate-100 ml-2">
                                                <Quote className="w-4 h-4 absolute top-4 left-3 text-slate-300" />
                                                <span className="pl-6 block leading-relaxed">{nom.comment}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>
            )}
        </div>
      </div>
    </div>
  );
};