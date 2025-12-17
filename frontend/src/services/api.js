import axios from 'axios';

export const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const friendApi = {
    searchUsers: (query) => api.get(`/users/search?query=${query}`),
    sendRequest: (receiverId) => api.post(`/friends/request/${receiverId}`),
    getPendingRequests: () => api.get('/friends/requests'),
    getSentRequests: () => api.get('/friends/sent-requests'),
    acceptRequest: (requestId) => api.post(`/friends/requests/${requestId}/accept`),
    rejectRequest: (requestId) => api.post(`/friends/requests/${requestId}/reject`),
    getFriends: () => api.get('/friends'),
};

export const groupApi = {
    createGroup: (name) => api.post('/groups', { name }),
    getGroups: () => api.get('/groups'),
    getGroup: (id) => api.get(`/groups/${id}`),
    addMember: (groupId, userId) => api.post(`/groups/${groupId}/users/${userId}`),
    getBalances: (groupId) => api.get(`/groups/${groupId}/balances`),
};

api.interceptors.request.use(
    (config) => {
        // Don't attach token for login/register endpoints to avoid 403s from stale tokens
        if (config.url.includes('/auth/login') || config.url.includes('/auth/register')) {
            return config;
        }

        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 (Unauthorized) and not already retrying
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) throw new Error("No refresh token");

                const res = await axios.post('/api/auth/refresh', { refreshToken });
                const { accessToken } = res.data;

                localStorage.setItem('accessToken', accessToken);
                // localStorage.setItem('refreshToken', res.data.refreshToken); // If rotating

                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed (expired long-term token), logout
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/'; // Simple redirect to force login
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);
