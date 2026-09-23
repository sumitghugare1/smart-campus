export const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = `${API_ORIGIN}/api`;

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('qtalk_token');
  const headers = {
    ...options.headers,
  };

  // Only set application/json if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || (data.reasons ? data.reasons.join(', ') : `Request failed (${response.status})`);
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => apiRequest('/auth/me'),
  getSkills: () => apiRequest('/auth/skills'),
  getBatches: () => apiRequest('/auth/batches'),

  // Jobs & Eligibility
  getJobs: () => apiRequest('/jobs'),
  getJobDetails: (id) => apiRequest(`/jobs/${id}`),
  createJob: (jobData) => apiRequest('/jobs', { method: 'POST', body: JSON.stringify(jobData) }),
  getJobEligibleCandidates: (id) => apiRequest(`/jobs/${id}/eligible`),

  // Applications & Pipeline
  applyJob: (jobId) => apiRequest(`/jobs/${jobId}/apply`, { method: 'POST' }),
  getJobApplications: (jobId) => apiRequest(`/jobs/${jobId}/applications`),
  updateApplicationStatus: (appId, status) =>
    apiRequest(`/applications/${appId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getMyApplications: () => apiRequest('/my/applications'),

  // Notifications
  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
  getJobReadStats: (jobId) => apiRequest(`/notifications/jobs/${jobId}/read-stats`),

  // Chat & Messages
  getBatchMessages: (batchId) => apiRequest(`/messages?batch_id=${batchId}`),
  getDirectMessages: (userId) => apiRequest(`/messages/dm/${userId}`),
  sendMessage: (payload) => apiRequest('/messages', { method: 'POST', body: JSON.stringify(payload) }),
  getChatContacts: () => apiRequest('/messages/contacts'),

  // Study Resources
  getResources: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/resources${q ? `?${q}` : ''}`);
  },
  uploadResource: (formData) => apiRequest('/resources', { method: 'POST', body: formData }),
  getResourceCategories: () => apiRequest('/resources/categories'),

  // Interview Bank
  getInterviews: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/interviews${q ? `?${q}` : ''}`);
  },
  shareInterview: (payload) => apiRequest('/interviews', { method: 'POST', body: JSON.stringify(payload) }),
  getInterviewMetadata: () => apiRequest('/interviews/metadata'),

  // Trainer
  getMyBatches: () => apiRequest('/trainer/my-batches'),
  markAttendance: (session_date, batch_id, records) =>
    apiRequest('/trainer/attendance', { method: 'POST', body: JSON.stringify({ session_date, batch_id, records }) }),
  submitMockScore: (mockData) =>
    apiRequest('/trainer/mocks', { method: 'POST', body: JSON.stringify(mockData) }),
  getBatchReadiness: (batchId) => apiRequest(`/trainer/batches/${batchId}/readiness`),
  getBatchStudentsForAttendance: (batchId, date) =>
    apiRequest(`/trainer/batches/${batchId}/students?date=${date}`),

  // Admin Analytics
  getAnalyticsDashboard: () => apiRequest('/analytics/dashboard'),

  // Manager: Batches, Subjects, Staff, Trainer Assignments, Students
  getManagerOverview: () => apiRequest('/manager/overview'),
  getManagerBatches: () => apiRequest('/manager/batches'),
  createManagerBatch: (payload) => apiRequest('/manager/batches', { method: 'POST', body: JSON.stringify(payload) }),
  getManagerSubjects: () => apiRequest('/manager/subjects'),
  createManagerSubject: (payload) => apiRequest('/manager/subjects', { method: 'POST', body: JSON.stringify(payload) }),
  getManagerStaff: (role) => apiRequest(`/manager/staff${role ? `?role=${role}` : ''}`),
  createManagerStaff: (payload) => apiRequest('/manager/staff', { method: 'POST', body: JSON.stringify(payload) }),
  assignTrainerToBatch: (payload) => apiRequest('/manager/batch-trainers', { method: 'POST', body: JSON.stringify(payload) }),
  removeTrainerAssignment: (assignmentId) => apiRequest(`/manager/batch-trainers/${assignmentId}`, { method: 'DELETE' }),
  getManagerStudents: (batchId) => apiRequest(`/manager/students${batchId ? `?batch_id=${batchId}` : ''}`),
  createManagerStudent: (payload) => apiRequest('/manager/students', { method: 'POST', body: JSON.stringify(payload) }),
  moveManagerStudentBatch: (userId, batch_id) =>
    apiRequest(`/manager/students/${userId}/batch`, { method: 'PATCH', body: JSON.stringify({ batch_id }) }),
};
