import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LeaderboardStorage, UserStorage, teamStorage } from '@/lib/ApiStorage';
import { ARTLevelLeaderboardResponse, TeamLevelLeaderboardResponse } from '@/data/models/Interfaces';
import { STORAGE_KEYS } from '@/data/models/Interfaces';

type LeaderboardResponse = ARTLevelLeaderboardResponse | TeamLevelLeaderboardResponse;

interface AwardDetails {
  awardName: string;
  nominations: {
    nominator: string;
    nomination_date: string;
    comments: string;
  }[];
}

export default function LeaderBoard() {
  const [activeTab, setActiveTab] = useState<'art' | 'team'>('art');
  const [artLeaderboard, setArtLeaderboard] = useState<LeaderboardResponse[]>([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState<LeaderboardResponse[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedTeamName, setSelectedTeamName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedAwardDetails, setSelectedAwardDetails] = useState<AwardDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamFetching, setTeamFetching] = useState(true);
  const [tokenError, setTokenError] = useState(false);

  const artId = localStorage.getItem(STORAGE_KEYS.ART_ID) || '';
  console.log('🟢 LeaderBoard component mounted, artId:', artId);

  // Fetch current user's team on component mount
  const fetchUserTeam = async () => {
    setTeamFetching(true);
    setTokenError(false);
    try {
      const userDetails = await UserStorage.getCurrentUserDetails();
      console.log('===== FULL USER RESPONSE =====');
      console.log('Full Response:', userDetails);
      console.log('Response Type:', typeof userDetails);
      console.log('Response Keys:', userDetails ? Object.keys(userDetails) : 'null/undefined');
      console.log('================================');
      
      // Check for token error
      if (userDetails?.code === 'token_not_valid' || userDetails?.detail === 'Given token not valid for any token type') {
        console.warn('❌ Token Error Detected');
        setTokenError(true);
        return;
      }
      
      const teamName = userDetails?.team_name;
      console.log('Team Name from user details:', teamName);
      
      if (!teamName) {
        console.warn('❌ No team_name found in user details');
        return;
      }

      // Fetch all teams for the ART to find the team_id by matching team_name
      const artIdValue = userDetails?.art_id || artId;
      console.log('Fetching teams for ART:', artIdValue);
      
      const teams = await teamStorage.getTeams(artIdValue);
      console.log('Teams fetched:', teams);
      
      // Find the team that matches the user's team_name
      const userTeam = teams?.find((team: any) => team.team_name === teamName);
      console.log('Matching team found:', userTeam);
      
      if (userTeam) {
        console.log('✅ Setting team state with:', { 
          teamId: userTeam.team_id, 
          teamName: userTeam.team_name 
        });
        setSelectedTeamId(userTeam.team_id);
        setSelectedTeamName(userTeam.team_name);
      } else {
        console.warn('❌ Team with name "' + teamName + '" not found in teams list');
        console.warn('Available teams:', teams?.map((t: any) => t.team_name));
      }
    } catch (error) {
      console.error('❌ Error fetching user team:', error);
      setTokenError(true);
    } finally {
      setTeamFetching(false);
    }
  };

  // Fetch user's team on component mount
  useEffect(() => {
    fetchUserTeam();
  }, []);

  // Fetch ART Level Leaderboard
  const fetchARTLeaderboard = async () => {
    if (!artId) return;
    setLoading(true);
    try {
      const data = await LeaderboardStorage.getARTLevelLeaderboard(artId);
      console.log('API Response for ART:', data);
      
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

      console.log('Extracted leaderboardArray:', leaderboardArray, 'length:', leaderboardArray.length);

      // Transform data to match expected interface
      const transformedData = leaderboardArray.map((item: any) => {
        // Transform awards with flexible field name handling
        const awardsArray = item.List_of_awards || item.awards || [];
        const transformedAwards = awardsArray.map((award: any) => ({
          award: award.award || award.award_name || award.awardName || '',
          total_nomniations_for_award: award.total_nomniations_for_award || award.total_nominations_for_award || 0,
          nominations_information: award.nominations_information || award.nominationsInformation || []
        }));

        return {
          employeename: item.employee || item.employeename || 'Unknown',
          image: item.image || item.profilePicture || '',
          total_awards: item.nominations_count || item.total_awards || 0,
          total_no_of_points: item.total_no_of_points || 0,
          List_of_awards: transformedAwards
        };
      });

      console.log('Transformed data:', transformedData);

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
    }
  };

  // Fetch Team Level Leaderboard
  const fetchTeamLeaderboard = async (teamId: string) => {
    if (!teamId) return;
    setLoading(true);
    try {
      const data = await LeaderboardStorage.getTeamLevelLeaderboard(teamId);
      console.log('API Response for Team:', data);
      
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

      console.log('Extracted leaderboardArray:', leaderboardArray, 'length:', leaderboardArray.length);

      // Transform data to match expected interface
      const transformedData = leaderboardArray.map((item: any) => {
        // Transform awards with flexible field name handling
        const awardsArray = item.List_of_awards || item.awards || [];
        const transformedAwards = awardsArray.map((award: any) => ({
          award: award.award || award.award_name || award.awardName || '',
          total_nomniations_for_award: award.total_nomniations_for_award || award.total_nominations_for_award || 0,
          nominations_information: award.nominations_information || award.nominationsInformation || []
        }));

        return {
          employeename: item.employee || item.employeename || 'Unknown',
          image: item.image || item.profilePicture || '',
          total_awards: item.nominations_count || item.total_awards || 0,
          total_no_of_points: item.total_no_of_points || 0,
          List_of_awards: transformedAwards
        };
      });

      console.log('Transformed data:', transformedData);

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
    }
  };

  // Sort leaderboard by points in descending order
  const sortLeaderboardByPoints = (data: any) => {
    // Ensure data is an array
    if (!Array.isArray(data)) {
      console.warn('sortLeaderboardByPoints received non-array data:', data);
      return [];
    }
    return [...data].sort((a, b) => b.total_no_of_points - a.total_no_of_points);
  };

  // Sort awards by number of nominations in descending order
  const sortAwardsByNominations = (awards: any[]) => {
    return [...awards].sort((a, b) => b.total_nomniations_for_award - a.total_nomniations_for_award);
  };

  // Handle award click to show modal
  const handleAwardClick = (awardName: string, nominations: any[]) => {
    setSelectedAwardDetails({
      awardName,
      nominations,
    });
    setIsModalOpen(true);
  };

  // Effect for ART leaderboard
  useEffect(() => {
    if (activeTab === 'art' && artId) {
      fetchARTLeaderboard();
    }
  }, [activeTab, artId]);

  // Effect for Team leaderboard
  useEffect(() => {
    if (activeTab === 'team' && selectedTeamId) {
      fetchTeamLeaderboard(selectedTeamId);
    }
  }, [selectedTeamId, activeTab]);

  const currentLeaderboard = activeTab === 'art' ? artLeaderboard : teamLeaderboard;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-gray-600">Track top performers and their achievements</p>
        </div>

        {/* Token Error Alert */}
        {tokenError && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-red-800">
                <h3 className="font-semibold mb-2">Session Expired</h3>
                <p className="text-sm mb-4">Your login session has expired. Please log in again to view the leaderboard.</p>
                <Button 
                  onClick={() => window.location.href = '/login'}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug: Show what we're getting from the API */}
        {teamFetching && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="text-blue-800">
                <p className="font-semibold mb-2">🔍 Fetching your team information...</p>
                <p className="text-sm">Check your browser console (F12) for detailed debug logs</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        {!tokenError && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'art' | 'team')} defaultValue="art">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="art" className="text-lg">
              ART Level Leaderboard
            </TabsTrigger>
            <TabsTrigger value="team" className="text-lg">
              Team Level Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* ART Level Leaderboard Tab */}
          <TabsContent value="art" className="space-y-6">
            {loading ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">Loading leaderboard...</CardContent>
              </Card>
            ) : artLeaderboard.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  No leaderboard data available
                </CardContent>
              </Card>
            ) : (
              <LeaderboardTable data={artLeaderboard} onAwardClick={handleAwardClick} />
            )}
          </TabsContent>

          {/* Team Level Leaderboard Tab */}
          <TabsContent value="team" className="space-y-6">
            {teamFetching ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  Loading your team information...
                </CardContent>
              </Card>
            ) : !selectedTeamId ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  You are not assigned to any team yet.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedTeamName} - Leaderboard</CardTitle>
                    <CardDescription>Top performers in your team</CardDescription>
                  </CardHeader>
                </Card>

                {loading ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500">Loading leaderboard...</CardContent>
                  </Card>
                ) : teamLeaderboard.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-gray-500">
                      No leaderboard data available for this team
                    </CardContent>
                  </Card>
                ) : (
                  <LeaderboardTable data={teamLeaderboard} onAwardClick={handleAwardClick} />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
        )}
      </div>

      {/* Award Details Modal */}
      <AwardDetailsModal open={isModalOpen} onOpenChange={setIsModalOpen} awardDetails={selectedAwardDetails} />
    </div>
  );
}

// Component: Leaderboard Table
function LeaderboardTable({
  data,
  onAwardClick,
}: {
  data: LeaderboardResponse[];
  onAwardClick: (awardName: string, nominations: any[]) => void;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
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

        return (
          <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {/* Employee Info */}
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-16 w-16 flex-shrink-0">
                    <AvatarImage src={employeeImage} alt={employeeName} />
                    <AvatarFallback>{employeeName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{employeeName}</h3>
                    <div className="flex gap-6 mt-2">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-600">Badges</span>
                        <span className="text-lg font-bold text-blue-600">{totalAwards}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-600">Points</span>
                        <span className="text-lg font-bold text-green-600">{totalPoints}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Awards Section */}
                <div className="flex-1 pl-4 border-l">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Awards</h4>
                  <div className="flex flex-wrap gap-2">
                    {sortedAwards.length > 0 ? (
                      sortedAwards.map((award, awardIndex) => (
                        <button
                          key={awardIndex}
                          onClick={() => onAwardClick(award.award || 'Unknown Award', award.nominations_information || [])}
                          className="hover:scale-105 transition-transform"
                        >
                          <Badge variant="secondary" className="cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900">
                            {award.award || 'Award'} ({award.total_nomniations_for_award || 0})
                          </Badge>
                        </button>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No awards yet</span>
                    )}
                  </div>
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
          <DialogTitle className="text-2xl">{awardDetails.awardName} - Nominations</DialogTitle>
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
