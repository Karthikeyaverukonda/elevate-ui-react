import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LeaderboardStorage, CommentsSummaryStorage } from '@/lib/ApiStorage';
import { ARTLevelLeaderboardResponse, TeamLevelLeaderboardResponse } from '@/data/models/Interfaces';
import { STORAGE_KEYS } from '@/data/models/Interfaces';
import { ArrowLeft, RefreshCw, Trophy, Zap, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

const BASE_MEDIA_URL = "http://127.0.0.1:8000";
interface AwardDetails {
  award_name: string;
  award_image?: string;
  nominations: {
    nominator: string;
    nomination_date: string;
    comments: string;
  }[];
}

interface CommentsSummaryState {
  employeeName: string;
  content: string;
  isLoading: boolean;
}

export default function LeaderBoard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'art' | 'team'>('art');
  const [artLeaderboard, setArtLeaderboard] = useState<ARTLevelLeaderboardResponse[]>([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState<TeamLevelLeaderboardResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAwardDetails, setSelectedAwardDetails] = useState<AwardDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamFetching, setTeamFetching] = useState(true);
  const [commentsSummary, setCommentsSummary] = useState<CommentsSummaryState>({
    employeeName: '',
    content: '',
    isLoading: false,
  });
  const [isCommentsSummaryOpen, setIsCommentsSummaryOpen] = useState(false);

  const artId = sessionStorage.getItem(STORAGE_KEYS.ART_ID) || '';
  console.log('🟢 LeaderBoard component mounted, artId:', artId);


  // Fetch ART Level Leaderboard
  const fetchARTLeaderboard = async () => {
    if (!artId) return;
    setLoading(true);
    try {
      const data = await LeaderboardStorage.getARTLevelLeaderboard(artId);
      console.log('✅ ART Leaderboard data fetched successfully');

      if (!data) {
        setArtLeaderboard([]);
        return;
      }

      // Extract array from response - backend returns {leaderboard: [...]}
      let leaderboardArray: any[] = [];
      if (Array.isArray(data)) {
        leaderboardArray = data;
      } else if (data.leaderboard && Array.isArray(data.leaderboard)) {
        leaderboardArray = data.leaderboard;
        console.log('Found data.leaderboard array with', leaderboardArray.length, 'items');
      } else if (data.results && Array.isArray(data.results)) {
        leaderboardArray = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        leaderboardArray = data.data;
      } else {
        // Try to find any array property
        for (const key in data) {
          if (Array.isArray(data[key])) {
            leaderboardArray = data[key];
            console.log('Found array in data.' + key);
            break;
          }
        }
      }

      console.log('📊 Total leaderboard entries:', leaderboardArray.length);

      // Transform data to match expected interface
      const transformedData = leaderboardArray.map((item: any) => {
        // Transform awards with flexible field name handling
        const awardsArray = item.List_of_awards || item.awards || [];
        const transformedAwards = awardsArray.map((award: any) => ({
          award_name: award.award_name || '',
          award_image: award.award_image || '',
          total_nomniations_for_award: award.total_nomniations_for_award || award.total_nominations_for_award || 0,
          nominations_information: award.nominations_information || award.nominationsInformation || []
        }));

        return {
          employee_id: item.employee_id || item.id || '',
          employeename: item.employee || item.employeename || 'Unknown',
          image: item.image || item.profilePicture || '',
          total_awards: item.nominations_count || item.total_awards || 0,
          total_no_of_points: item.total_no_of_points || 0,
          List_of_awards: transformedAwards
        };
      });

      console.log('📈 Transformation complete, entries ready for display');

      // Sort by points
      const sorted = [...transformedData].sort((a, b) =>
        (b.total_no_of_points || 0) - (a.total_no_of_points || 0)
      );
      setArtLeaderboard(sorted);
    } catch (error) {
      console.error('Error fetching ART leaderboard:', error);
      setArtLeaderboard([]);
    } finally {
      setLoading(false);
      setTeamFetching(false); // Stop team fetching state in case it was still loading due to user team fetch logic being intertwined with ART fetch in earlier versions
    }
  };

  // Fetch Team Level Leaderboard
  const fetchTeamLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await LeaderboardStorage.getTeamLevelLeaderboard();
      console.log('✅ Team Leaderboard data fetched successfully');

      if (!data) {
        setTeamLeaderboard([]);
        return;
      }

      // Extract array from response - backend returns {leaderboard: [...]}
      let leaderboardArray: any[] = [];
      if (Array.isArray(data)) {
        leaderboardArray = data;
      } else if (data.leaderboard && Array.isArray(data.leaderboard)) {
        leaderboardArray = data.leaderboard;
        console.log('Found data.leaderboard array with', leaderboardArray.length, 'items');
      } else if (data.results && Array.isArray(data.results)) {
        leaderboardArray = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        leaderboardArray = data.data;
      } else {
        // Try to find any array property
        for (const key in data) {
          if (Array.isArray(data[key])) {
            leaderboardArray = data[key];
            console.log('Found array in data.' + key);
            break;
          }
        }
      }

      console.log('📊 Total leaderboard entries:', leaderboardArray.length);

      // Transform data to match expected interface
      const transformedData = leaderboardArray.map((item: any) => {
        // Transform awards with flexible field name handling
        const awardsArray = item.List_of_awards || item.awards || [];
        const transformedAwards = awardsArray.map((award: any) => ({
          award_name: award.award_name || '',
          award_image: award.award_image || '',
          total_nomniations_for_award: award.total_nomniations_for_award || award.total_nominations_for_award || 0,
          nominations_information: award.nominations_information || award.nominationsInformation || []
        }));

        return {
          employee_id: item.employee_id || item.id || '',
          employeename: item.employee || item.employeename || 'Unknown',
          image: item.image || item.profilePicture || '',
          total_awards: item.nominations_count || item.total_awards || 0,
          total_no_of_points: item.total_no_of_points || 0,
          List_of_awards: transformedAwards
        };
      });

      console.log('📈 Transformation complete, entries ready for display');

      // Sort by points
      const sorted = [...transformedData].sort((a, b) =>
        (b.total_no_of_points || 0) - (a.total_no_of_points || 0)
      );
      setTeamLeaderboard(sorted);
    } catch (error) {
      console.error('Error fetching Team leaderboard:', error);
      setTeamLeaderboard([]);
    } finally {
      setLoading(false);
      setTeamFetching(false);
    }
  };

  // Handle award click to show modal
  const handleAwardClick = (award_name: string, nominations: any[]) => {
    setSelectedAwardDetails({
      award_name: award_name,
      nominations,
    });
    setIsModalOpen(true);
  };

  // Handle comments summary click
  const handleCommentsClick = async (employeeId: string, employeeName: string) => {
    console.log('💬 Comments clicked for:', employeeName, 'Employee ID:', employeeId);
    
    setCommentsSummary({
      employeeName: employeeName,
      content: '',
      isLoading: true,
    });
    setIsCommentsSummaryOpen(true);

    try {
      const response = await CommentsSummaryStorage.getCommentsSummary(employeeId);
      console.log('✅ Comments summary response:', response);
      setCommentsSummary((prev) => ({
        ...prev,
        content: response?.summary || 'No comments available',
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching comments summary:', error);
      setCommentsSummary((prev) => ({
        ...prev,
        content: 'Failed to fetch comments summary',
        isLoading: false,
      }));
    }
  };

  // Effect for ART leaderboard
  useEffect(() => {
    if (activeTab === 'art' && artId) {
      fetchARTLeaderboard();
    }
  }, [activeTab, artId]);

  // Effect for Team leaderboard
  useEffect(() => {
    if (activeTab === 'team') {
      fetchTeamLeaderboard();
    }
  }, [activeTab]);


  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' 
      ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' 
      : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'}`}>
      {/* Header */}
      <div className={`${theme === 'dark' 
        ? 'bg-slate-800/80 border-slate-700' 
        : 'bg-white/80'} backdrop-blur border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} px-8 py-5 mb-6 flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className={`${theme === 'dark' 
              ? 'text-slate-300 hover:text-white hover:bg-slate-700' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Leaderboard</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground'} mt-0.5`}>Track top performers and their achievements</p>
          </div>
        </div>
        {/* Removed Refresh and Theme toggle buttons as requested */}
      </div>

      <div className={`px-8 pb-8 max-w-7xl mx-auto`}>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'art' | 'team')} defaultValue="art">
          <TabsList className={`grid w-full grid-cols-2 mb-8 p-1 rounded-xl ${theme === 'dark' 
            ? 'bg-slate-800/80 border border-slate-700/80' 
            : 'bg-slate-100 border border-slate-200'}`}>
            <TabsTrigger value="art" className={`text-lg font-semibold py-3 rounded-lg transition-all duration-200 ${
              activeTab === 'art' 
                ? theme === 'dark'
                  ? 'bg-slate-700 text-white border border-slate-600 shadow-sm'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'
            }`}>
              ART Level Leaderboard
            </TabsTrigger>
            <TabsTrigger value="team" className={`text-lg font-semibold py-3 rounded-lg transition-all duration-200 ${
              activeTab === 'team' 
                ? theme === 'dark'
                  ? 'bg-slate-700 text-white border border-slate-600 shadow-sm'
                  : 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm'
                : theme === 'dark'
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 border border-transparent'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50 border border-transparent'
            }`}>
              Team Level Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* ART Level Leaderboard Tab */}
          <TabsContent value="art" className="space-y-6">
            {loading ? (
              <Card className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>
                <CardContent className={`pt-6 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Loading leaderboard...</CardContent>
              </Card>
            ) : artLeaderboard.length === 0 ? (
              <Card className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>
                <CardContent className={`pt-6 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  No leaderboard data available
                </CardContent>
              </Card>
            ) : (
              <LeaderboardTable data={artLeaderboard} onAwardClick={handleAwardClick} onCommentsClick={handleCommentsClick} theme={theme} />
            )}
          </TabsContent>

          {/* Team Level Leaderboard Tab */}
          <TabsContent value="team" className="space-y-6">
            {teamFetching ? (
              <Card className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>
                <CardContent className={`pt-6 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                  Loading your team information...
                </CardContent>
              </Card>
            ) : (
              <>

                {loading ? (
                  <Card className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>
                    <CardContent className={`pt-6 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>Loading leaderboard...</CardContent>
                  </Card>
                ) : teamLeaderboard.length === 0 ? (
                  <Card className={`${theme === 'dark' ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>
                    <CardContent className={`pt-6 text-center ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
                      No leaderboard data available for this team
                    </CardContent>
                  </Card>
                ) : (
                  <LeaderboardTable data={teamLeaderboard} onAwardClick={handleAwardClick} onCommentsClick={handleCommentsClick} theme={theme} />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Award Details Modal */}
      <AwardDetailsModal open={isModalOpen} onOpenChange={setIsModalOpen} awardDetails={selectedAwardDetails} />

      {/* Comments Summary Modal */}
      <CommentsSummaryModal 
        open={isCommentsSummaryOpen} 
        onOpenChange={setIsCommentsSummaryOpen} 
        commentsSummary={commentsSummary} 
      />
    </div>
  );
}

// Component: Position Badge
function PositionBadge({ position }: { position: number }) {
  const getPositionColor = () => {
    switch (position) {
      case 1:
        return 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 text-white shadow-lg shadow-yellow-400/40';
      case 2:
        return 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-lg shadow-slate-400/40';
      case 3:
        return 'bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 text-white shadow-lg shadow-orange-400/40';
      default:
        return 'bg-gradient-to-br from-blue-300 via-indigo-400 to-indigo-500 text-white shadow-lg shadow-indigo-400/40';
    }
  };

  const getPositionIcon = () => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return position;
    }
  };

  return (
    <div className={`flex items-center justify-center h-14 w-14 rounded-full font-bold text-lg ${getPositionColor()}`}>
      {getPositionIcon()}
    </div>
  );
}

// Component: Leaderboard Table
function LeaderboardTable({
  data,
  onAwardClick,
  onCommentsClick,
  theme,
}: {
  data: ARTLevelLeaderboardResponse[];
  onAwardClick: (award_name: string, nominations: any[]) => void;
  onCommentsClick: (employeeId: string, employeeName: string) => void;
  theme: 'light' | 'dark';
}) {
  if (!data || data.length === 0) {
    return (
      <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
        <p>No leaderboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.map((employee, index) => {
        const employeeName = (employee as any)?.employeename || 'Unknown Employee';
        const employeeImage = (employee as any)?.image || '';
        const totalAwards = (employee as any)?.total_awards || 0;
        const totalPoints = (employee as any)?.total_no_of_points || 0;
        const awardsList = (employee as any)?.List_of_awards || [];

        const sortedAwards = [...awardsList].sort(
          (a, b) => (b.total_nomniations_for_award || 0) - (a.total_nomniations_for_award || 0)
        );

        const isTopThree = index < 3;
        const cardBgClass = isTopThree
          ? index === 0
            ? theme === 'dark'
              ? 'bg-gradient-to-r from-yellow-900/40 to-amber-900/40 border-yellow-700/30'
              : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 shadow-lg shadow-yellow-200/40'
            : index === 1
              ? theme === 'dark'
                ? 'bg-gradient-to-r from-slate-600/30 to-gray-600/30 border-slate-600/30'
                : 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200 shadow-lg shadow-slate-200/40'
              : theme === 'dark'
                ? 'bg-gradient-to-r from-orange-900/40 to-amber-900/40 border-orange-700/30'
                : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 shadow-lg shadow-orange-200/40'
          : theme === 'dark'
            ? 'bg-slate-700/50 hover:bg-slate-700/70 border-slate-600/50'
            : 'bg-white hover:shadow-md border-slate-200';

        return (
          <Card key={index} className={`overflow-hidden transition-all ${cardBgClass} border`}>
            <CardContent className={`p-6 ${theme === 'dark' ? 'text-slate-100' : ''}`}>
              <div className="flex items-center gap-6">
                {/* Position Badge - Show for ALL employees */}
                <PositionBadge position={index + 1} />

                {/* Employee Info */}
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className={`flex-shrink-0 ring-2 ${index === 0 ? 'h-16 w-16 ring-yellow-300' : index === 1 ? 'h-16 w-16 ring-slate-300' : index === 2 ? 'h-16 w-16 ring-orange-300' : 'h-12 w-12 ring-slate-200'}`}>
                    <AvatarImage src={BASE_MEDIA_URL + employeeImage} alt={employeeName} />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold">{employeeName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate ${isTopThree 
                      ? `text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}` 
                      : `text-base ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}`}>{employeeName}</h3>
                    <div className="flex gap-4 mt-2 flex-wrap">
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                        theme === 'dark' 
                          ? 'bg-blue-900/40 text-blue-300' 
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        <Trophy className="h-3.5 w-3.5" />
                        <span className="text-sm font-semibold">{totalAwards} Badges</span>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${
                        theme === 'dark' 
                          ? 'bg-emerald-900/40 text-emerald-300' 
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        <Zap className="h-3.5 w-3.5" />
                        <span className="text-sm font-semibold">{totalPoints} Points</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Awards Section */}
                {sortedAwards.length > 0 && (
                  <div className="flex-shrink-0">
                    <div className="flex gap-2 flex-wrap justify-end max-w-xs">
                      {sortedAwards.slice(0, 3).map((award, awardIndex) => (
                        <button
                          key={awardIndex}
                          onClick={() => onAwardClick(award.award_name || 'Unknown Award', award.nominations_information || [])}
                          className="group relative hover:scale-110 transition-transform"
                          title={award.award_name}
                        >
                          <Avatar className="h-10 w-10 ring-2 ring-white hover:ring-indigo-300 shadow-sm group-hover:shadow-md transition-shadow">
                            <AvatarImage src={award.award_image ? BASE_MEDIA_URL + award.award_image : "/placeholder.svg"} alt={award.award_name} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white text-xs font-bold">{'A'}</AvatarFallback>
                          </Avatar>
                          <Badge className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs px-1 py-0 h-5 w-5 flex items-center justify-center rounded-full">
                            {award.total_nomniations_for_award || 0}
                          </Badge>
                        </button>
                      ))}
                      {sortedAwards.length > 3 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className={`h-10 w-10 flex items-center justify-center rounded-full ring-2 text-xs font-bold hover:scale-110 transition-transform ${
                              theme === 'dark'
                                ? 'bg-slate-600 ring-slate-500 text-slate-100'
                                : 'bg-slate-100 ring-white text-slate-600'
                            }`}>
                              +{sortedAwards.length - 3}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-xl rounded-lg z-50">
                            <h4 className="font-semibold text-sm mb-2 text-slate-900 dark:text-slate-100 px-1">Other Badges</h4>
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                              {sortedAwards.slice(3).map((award, awardIndex) => (
                                <button
                                  key={awardIndex}
                                  onClick={() => onAwardClick(award.award_name || 'Unknown Award', award.nominations_information || [])}
                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-left transition-colors w-full"
                                >
                                  <div className="relative flex-shrink-0">
                                    <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-slate-700">
                                      <AvatarImage src={award.award_image ? BASE_MEDIA_URL + award.award_image : "/placeholder.svg"} alt={award.award_name} />
                                      <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white text-xs font-bold">{'A'}</AvatarFallback>
                                    </Avatar>
                                    <Badge className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] px-1 py-0 h-4 w-4 flex items-center justify-center rounded-full">
                                      {award.total_nomniations_for_award || 0}
                                    </Badge>
                                  </div>
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate flex-1">{award.award_name}</span>
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )}

                {/* Comments Summary Button */}
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCommentsClick((employee as any)?.employee_id || '', employeeName)}
                    className={`gap-2 ${theme === 'dark'
                      ? 'border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/30 hover:border-indigo-500/60'
                      : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                    title="View comments summary"
                  >
                    <span>💬</span>
                    <span className="hidden sm:inline">Comments</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Component: Award Details Modal
function AwardDetailsModal({
  open,
  onOpenChange,
  awardDetails,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  awardDetails: AwardDetails | null;
}) {
  if (!awardDetails) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{awardDetails.award_name} - Nominations</DialogTitle>
          <DialogDescription>
            Showing all nominations for this award ({awardDetails.nominations.length})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {awardDetails.nominations.length > 0 ? (
            awardDetails.nominations.map((nomination, index) => (
              <Card key={index} className="bg-slate-50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">Nominator: {nomination.nominator}</p>
                        <p className="text-sm text-gray-600">
                          Date: {new Date(nomination.nomination_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    {nomination.comments && (
                      <div>
                        <p className="text-sm font-medium text-gray-700">Comments:</p>
                        <p className="text-sm text-gray-600 mt-1 italic">{nomination.comments}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-gray-500 py-8">No nominations found</p>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component: Comments Summary Modal
function CommentsSummaryModal({
  open,
  onOpenChange,
  commentsSummary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commentsSummary: CommentsSummaryState;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Comments Summary</DialogTitle>
          <DialogDescription>
            Summary of comments for {commentsSummary.employeeName}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 min-h-[200px] bg-slate-50 rounded-lg p-4 border border-slate-200">
          {commentsSummary.isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                <p className="text-gray-600">Loading comments summary...</p>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{commentsSummary.content}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
