import { AuthResponse, User, StudySession, StudyNote, StudyPlan, UserGoals, ReminderSettings, Badge } from '../types';

const API_BASE = '/api';

// Token helper
export function getStoredToken(): string | null {
  return localStorage.getItem('study_streak_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('study_streak_token', token);
}

export function removeStoredToken(): void {
  localStorage.removeItem('study_streak_token');
}

export function getStoredUser(): Omit<User, 'passwordHash'> | null {
  const data = localStorage.getItem('study_streak_user');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setStoredUser(user: Omit<User, 'passwordHash'>): void {
  localStorage.setItem('study_streak_user', JSON.stringify(user));
}

export function removeStoredUser(): void {
  localStorage.removeItem('study_streak_user');
}

// Custom request wrapper
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errBody = await response.json();
      errorMsg = errBody.error || errorMsg;
    } catch {
      // Ignored
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth API
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    setStoredUser(res.user);
    return res;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    setStoredToken(res.token);
    setStoredUser(res.user);
    return res;
  },

  async getMe(): Promise<{ user: Omit<User, 'passwordHash'> }> {
    const res = await request<{ user: Omit<User, 'passwordHash'> }>('/auth/me');
    setStoredUser(res.user);
    return res;
  },

  async updateProfile(name?: string, password?: string, profilePicture?: string): Promise<{ user: Omit<User, 'passwordHash'> }> {
    const res = await request<{ user: Omit<User, 'passwordHash'> }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, password, profilePicture }),
    });
    setStoredUser(res.user);
    return res;
  },

  // Sessions API
  async getSessions(): Promise<StudySession[]> {
    return request<StudySession[]>('/sessions');
  },

  async createSession(session: { date: string; startTime: string; endTime: string; subject?: string; topic: string; notes?: string; clientToday: string }): Promise<StudySession> {
    return request<StudySession>('/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
  },

  async updateSession(id: string, session: { date?: string; startTime?: string; endTime?: string; subject?: string; topic?: string; notes?: string; clientToday: string }): Promise<StudySession> {
    return request<StudySession>(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(session),
    });
  },

  async deleteSession(id: string, clientToday: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/sessions/${id}?clientToday=${clientToday}`, {
      method: 'DELETE',
    });
  },

  // Notes API
  async getNotes(): Promise<StudyNote[]> {
    return request<StudyNote[]>('/notes');
  },

  async saveNote(note: { date: string; topicsCovered?: string; conceptsLearned?: string; importantPoints?: string; revisionNotes?: string; personalRemarks?: string }): Promise<StudyNote> {
    return request<StudyNote>('/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    });
  },

  // Plans API
  async getPlans(): Promise<StudyPlan[]> {
    return request<StudyPlan[]>('/plans');
  },

  async createPlan(plan: { date: string; subject: string; topic: string; estimatedMinutes: number; priority: string }): Promise<StudyPlan> {
    return request<StudyPlan>('/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  },

  async updatePlan(id: string, plan: { date?: string; subject?: string; topic?: string; estimatedMinutes?: number; priority?: string; completed?: boolean; clientToday?: string }): Promise<StudyPlan> {
    return request<StudyPlan>(`/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    });
  },

  async deletePlan(id: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/plans/${id}`, {
      method: 'DELETE',
    });
  },

  // Goals API
  async getGoals(): Promise<UserGoals> {
    return request<UserGoals>('/goals');
  },

  async saveGoals(goals: { dailyHours: number; weeklyHours: number; monthlyHours: number }): Promise<UserGoals> {
    return request<UserGoals>('/goals', {
      method: 'POST',
      body: JSON.stringify(goals),
    });
  },

  // Reminders API
  async getReminders(): Promise<ReminderSettings> {
    return request<ReminderSettings>('/reminders');
  },

  async saveReminders(settings: { time: string; enabled: boolean }): Promise<ReminderSettings> {
    return request<ReminderSettings>('/reminders', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  // Badges API
  async getBadges(): Promise<Badge[]> {
    return request<Badge[]>('/badges');
  },

  // Stats Dashboard API
  async getStats(clientToday: string): Promise<any> {
    return request<any>(`/stats?clientToday=${clientToday}`);
  },
};
