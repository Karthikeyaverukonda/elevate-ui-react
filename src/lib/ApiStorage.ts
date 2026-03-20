import { toast } from "sonner";

import { STORAGE_KEYS} from "@/data/models/Interfaces";



const BASE_API_URL = "http://127.0.0.1:8000/api";

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

export const apiRequest = async (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endPath: string,
  queryParams?: Record<string, string>,
  body?: Record<string, any>,
  failureMessage: string = 'API request failed'
) => {
  try {
    const url = new URL(`${BASE_API_URL}/${endPath}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const options: RequestInit = {
      method,
      headers: getAuthHeaders(),
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || failureMessage);
    }

    return await response.json();
  } catch (err: any) {
    toast.error(err?.message || failureMessage);
    return null;
  }
};


export const apiFormDataRequest = async (
  method: 'POST' | 'PUT',
  endPath: string,
  queryParams?: Record<string, string>,
  formData?: FormData,
  failureMessage: string = 'API request failed'
) => {
  try {
    const url = new URL(`${BASE_API_URL}/${endPath}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      },
      body: formData,
    };

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || failureMessage);
    }

    return await response.json();
  } catch (err: any) {
    toast.error(err?.message || failureMessage);
    return null;
  }
};

export const artStorage = {
  getMyART: async () => {
    const response = await apiRequest('GET', 'art/', undefined, undefined, 'Failed to fetch ART');
    return response ? response[0] : null;
  },

  createMyArt: async (art_name: string, department: string) => {
    const response = await apiRequest('POST', 'art/', undefined, { art_name:art_name, department: department ,user:localStorage.getItem('user_id')}, 'Failed to create ART');
    return response ? response : null;
  },

  updateMyArt: async (art_id: string, art_name: string, department: string) => {
    const response = await apiRequest('PUT', 'art/', { art_id:art_id }, { art_name: art_name, department: department }, 'Failed to update ART');
    return response ? response : null;
  },

  deleteMyArt: async (art_id: string) => {
    const response = await apiRequest('DELETE', 'art/', { art_id: art_id }, undefined, 'Failed to delete ART');
    return response ? response : null;
  },

//this API call is to fetch ART and teams data for user home page,to choose which team user wants to join
  getArtAndTeamsData: async () => {
    const response = await apiRequest('GET', 'get-arts-and-teams/', undefined, undefined, 'Failed to fetch ART and teams data');
    return response ? response : null;
  }

}

export const teamStorage = {
  getTeams: async (art_id: string) => {
    const response = await apiRequest('GET', 'teams/', { art_id: art_id }, undefined, 'Failed to fetch teams');
    return response ? response : [];
  },

  createTeam: async (team_name: string, team_description: string, art: string) => {
    const response = await apiRequest('POST', 'teams/', undefined, { team_name: team_name, team_description: team_description, art: art }, 'Failed to create team');
    return response ? response : null;
  },

  updateTeam: async (team_id: string, team_name: string, team_description: string, art: string) => {
    const response = await apiRequest('PUT', 'teams/', { team_id: team_id }, { team_name: team_name, team_description: team_description, art: art }, 'Failed to update team');
    return response ? response : null;
  },

  deleteTeam: async (team_id: string) => {
    const response = await apiRequest('DELETE', 'teams/', { team_id: team_id}, undefined, 'Failed to delete team');
    return response ? response : null;
  }


}

export const sprintStorage = {

  getActiveSprintForART: async () => {
    const response = await apiRequest('GET', 'get-current-sprint/',undefined, undefined, 'Failed to fetch active sprint');
    return response ? response : null;
  },

  getSprints: async (art_id: any) => {
    const response = await apiRequest('GET', 'sprint/', { art_id: art_id }, undefined, 'Failed to fetch sprints');
    return response ? response : [];
  },

  createSprint: async (sprint_name: string, art: string, year: string, start_date: string, end_date: string, quater: '1' | '2' | '3' | '4', status: 'Planned' | 'Active' | 'Completed') => {
    const response = await apiRequest('POST', 'sprint/', undefined, { sprint_name: sprint_name, art: art, year: year, start_date: start_date, end_date: end_date, quater: quater, status: status }, 'Failed to create sprint');
    return response ? response : null;
  },

  updateSprint: async (sprint_id: string, sprint_name: string, art: string, year: string, start_date: string, end_date: string, quater: '1' | '2' | '3' | '4', status: 'Planned' | 'Active' | 'Completed') => {
    const response = await apiRequest('PUT', 'sprint/', { sprint_id: sprint_id }, { sprint_name: sprint_name, art: art, year: year, start_date: start_date, end_date: end_date, quater: quater, status: status }, 'Failed to update sprint');
    return response ? response : null;
  },

  deleteSprint: async (sprint_id: string) => {
    const response = await apiRequest('DELETE', 'sprint/', { sprint_id: sprint_id, art : localStorage.getItem(STORAGE_KEYS.ART_ID) || ''  }, undefined, 'Failed to delete sprint');
    return response ? response : null;
  }

}

export const awardStorage = {
  getAwards: async () => {
    const response = await apiRequest('GET', 'awards/', undefined, undefined, 'Failed to fetch awards');
    return response ? response : [];

  },
  addAward: async (name: string, description: string, image: File | null) => {
    const formData = new FormData();
    formData.append('award_name', name.trim());
    formData.append('award_description', description.trim());
    if (image) formData.append('award_image', image);
    const response = await apiFormDataRequest('POST', 'awards/', undefined, formData, 'Failed to add award');
    return response ? response : null;
  },
  updateAward: async (id: string, name: string, description: string, image: File | null) => {
    const formData = new FormData();
    formData.append('award_name', name.trim());
    formData.append('award_description', description.trim());
    if (image) formData.append('award_image', image);
    const response = await apiFormDataRequest('PUT', 'awards/', { award_id: id }, formData, 'Failed to update award');
    return response ? response : null;
  },
  deleteAward: async(id: string) => {
    const response = await apiRequest('DELETE', 'awards/', { award_id: id }, undefined, 'Failed to delete award');
    return response ? response : null;
}
};

export const employeeStorage = {

  getUserHomePageData: async () => {
    const response = await apiRequest('GET', 'get-user-home-page-data/', undefined, undefined, 'Failed to fetch user homepage data');
    return response ? response : null;
  },
  
  getmyARTEmployees: async (art_id: string) => {
    const response = await apiRequest('GET', 'art-employees/', { art_id }, undefined, 'Failed to fetch employees');
    return response ? response : [];
  },

  joinTeam:async ( team_id: string) => {
    const response = await apiRequest('POST', 'team-members/', undefined, { team: team_id }, 'Failed to join team');
    return response ? response : null;
},
  getPendingEmployeesForArtManager: async (art_id: any) => {
    const response = await apiRequest('GET', 'pending-art-employees/', { art_id: art_id }, undefined, 'Failed to fetch pending employees');
    return response ? response : [];
  },
  updateEmployeeTeamApprovalStatus: async (employee_id: string, team_id: string, is_active: 1 | 0) => {
    const response = await apiRequest('PUT', 'team-members/', { employee_id: employee_id }, { team_id: team_id, is_active: is_active }, 'Failed to update employee status');
    return response ? response : null;
  },
  removeEmployeeFromTeam: async (employee_id: string, team_id: string) => {
    const response = await apiRequest('DELETE', 'team-members/', { employee_id: employee_id},{ team_id: team_id }, 'Failed to remove employee from team');
    return response ? response : null;
  }

};

export const AdminActions = {

  getAdminDashboardData: async () => {
    const response = await apiRequest('GET', 'admin-dashboard/', undefined, undefined, 'Failed to fetch admin dashboard data');
    return response ? response : null;
  },

  getRegisteredARTManagers: async () => {
    const response = await apiRequest('GET', 'registered-art-managers/', undefined, undefined, 'Failed to fetch registered ART managers');
    return response ? response : [];
  },
  getPendingARTManagersRequests: async () => {
    const response = await apiRequest('GET', 'pending-art-managers/', undefined, undefined, 'Failed to fetch pending ART managers requests');
    return response ? response : null;
  },

  updateARTManagerRequestStatus: async (art_manager_id: string, status: 'Approved' | 'Rejected') => {
    const response = await apiRequest('PUT', 'update-art-manager-request/', { art_manager_id: art_manager_id }, { status: status }, 'Failed to update ART manager request status');
    return response ? response : null;
  }
  
};

export const LeaderboardStorage = {
  getARTLevelLeaderboard: async (art_id: string) => {
    const response = await apiRequest('GET', 'leaderboard-art/', { art_id: art_id }, undefined, 'Failed to fetch ART level leaderboard');
    return response ? response : [];
  },

  getTeamLevelLeaderboard: async () => {
    const response = await apiRequest('GET', 'leaderboard-team/', undefined, undefined, 'Failed to fetch Team level leaderboard');
    return response ? response : [];
  }

};

export const NominationsStorage = {
  //nomiantor_id is employee id of the person who is nominating, nominee_id is employee id of the person who is being nominated
  postNomination: async (nominator_id: string, nominee_id: string, award_id: string, sprint_id: string, comments: string) => {
    const response = await apiRequest('POST', 'nomination/', undefined, { nominator_id, nominee_id, award_id, sprint_id, comments }, 'Failed to submit nomination');
    return response ? response : null;
  },

  getUsersCurrentSprintNomiationData: async () => {
    const response = await apiRequest('GET', 'nomination-data/', undefined, undefined, 'Failed to fetch nomination data');
    return response ? response : null;
  }


};

export const UserStorage = {
  getCurrentUserDetails: async () => {
    const response = await apiRequest('GET', 'get-user-employee-details/', undefined, undefined, 'Failed to fetch user details');
    return response ? response : null;
  },

  logoutUser: () => async () => {
    const response = await apiRequest('POST', 'logout/', undefined, undefined, 'Failed to logout');
    if (response) {
      localStorage.clear();
      sessionStorage.clear();
    }
    else {
      toast.error('Failed to logout');
    }
  }

};

export const TokenRefreshStorage = {
  refreshToken: async () => {
    const response = await apiRequest('POST', 'token/refresh/', undefined, { refresh: localStorage.getItem('refresh_token') }, 'Failed to refresh token');
    if (response && response.access) {
      localStorage.setItem('access_token', response.access);
      console.log('Token refreshed successfully');
    } else {
      console.error('Failed to refresh token');
    }

  } }