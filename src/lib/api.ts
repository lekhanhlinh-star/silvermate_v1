export const BASE_URL = "https://silvermate-v1-0-0.onrender.com";
export const WS_URL = BASE_URL.replace(/^http/, "ws");


function getToken(): string | null {
  return localStorage.getItem("silvermate_token");
}

export function setToken(token: string) {
  localStorage.setItem("silvermate_token", token);
}

export function clearToken() {
  localStorage.removeItem("silvermate_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!headers["Content-Type"] && !(options.body instanceof URLSearchParams) && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.location.href = "/login";
      return new Promise(() => {}); // Stop further execution
    }
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  if (res.status === 204) return null as unknown as T;

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const text = await res.text();
    return text ? JSON.parse(text) : (null as unknown as T);
  }
  return res.text() as unknown as T;
}

/**
 * Specialized request helper for downloading blobs
 */
async function requestBlob(path: string, options: RequestInit = {}): Promise<Blob> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      window.location.href = "/login";
      return new Promise(() => {}); 
    }
    const text = await res.text().catch(() => "Unknown error");
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  return res.blob();
}



// Auth
export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  user_type: "PARENT" | "CHILD";
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface GoogleAuthResponse {
  authorization_url: string;
}

export interface UserRead {
  id: string;
  email: string;
  full_name: string;
  user_type: "PARENT" | "CHILD";
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

export const auth = {
  register: (data: RegisterData) =>
    request<UserRead>("/auth/register", { method: "POST", body: JSON.stringify({ ...data, is_active: true, is_superuser: false, is_verified: false }) }),

  login: (email: string, password: string) => {
    const body = new URLSearchParams();
    body.append("username", email);
    body.append("password", password);
    return request<LoginResponse>("/auth/jwt/login", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },

  logout: () =>
    request("/auth/jwt/logout", { method: "POST" }),

  googleAuthorize: () =>
    request<GoogleAuthResponse>("/auth/google/authorize"),

  googleCallback: (code: string, state?: string) =>
    request<LoginResponse>(`/auth/google/callback?code=${encodeURIComponent(code)}${state ? `&state=${state}` : ""}`),

  lineAuthorize: () =>
    request<GoogleAuthResponse>("/auth/line/authorize"),

  lineCallback: (code: string, state?: string) =>
    request<LoginResponse>(`/auth/line/callback?code=${encodeURIComponent(code)}${state ? `&state=${state}` : ""}`),

  forgotPassword: (email: string) =>
    request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (token: string, password: string) =>
    request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) }),

  requestVerifyToken: (email: string) =>
    request("/auth/request-verify-token", { method: "POST", body: JSON.stringify({ email }) }),

  verify: (token: string) =>
    request<UserRead>("/auth/verify", { method: "POST", body: JSON.stringify({ token }) }),
};

// Users
export const users = {
  me: () => request<UserRead>("/users/me"),

  updateMe: (data: { full_name?: string; email?: string; password?: string; user_type?: "PARENT" | "CHILD" }) =>
    request<UserRead>("/users/me", { method: "PATCH", body: JSON.stringify(data) }),
};

// Connections
export interface PinResponse {
  success: boolean;
  pin_code: string;
  expires_at: string;
  connection_type: string;
  message: string;
}

export interface VerifyPinResponse {
  success: boolean;
  message: string;
  connection_created: boolean;
  connected_user: {
    id: string;
    email: string;
    full_name: string;
    user_type: string;
  };
}

export interface FamilyMember {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
}

export interface ConnectionPin {
  id: string;
  pin_code: string;
  connection_type: string;
  expires_at: string;
  is_used: boolean;
}

export const connections = {
  generatePin: (connectionType: "CHILD_TO_PARENT" | "PARENT_TO_CHILD") =>
    request<PinResponse>("/connections/generate-pin", {
      method: "POST",
      body: JSON.stringify({ connection_type: connectionType }),
    }),

  verifyPin: (pinCode: string) =>
    request<VerifyPinResponse>("/connections/verify-pin", {
      method: "POST",
      body: JSON.stringify({ pin_code: pinCode }),
    }),

  getFamily: () =>
    request<FamilyMember[]>("/connections/family"),

  getMyPins: (includeExpired = false) =>
    request<ConnectionPin[]>(`/connections/my-pins?include_expired=${includeExpired}`),
};

// Chatbot
export interface ChatSession {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  summary: string | null;
  is_active: boolean;
  title?: string | null;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  audio_url?: string | null;
  is_voice_message?: boolean;
  audio_path?: string | null;
  audio_duration?: number | null;
  audio_mime_type?: string | null;
  transcript?: string | null;
}

export const chatbot = {
  sendMessage: async (message: string, sessionId?: string): Promise<ChatMessage> => {
    const body = new URLSearchParams();
    body.append("message", message);
    if (sessionId) body.append("session_id", sessionId);

    return request<ChatMessage>("/chatbot/", {
      method: "POST",
      body,
    });
  },

  getSessions: () =>
    request<ChatSession[]>("/chatbot/sessions"),

  createSession: (title?: string) =>
    request<ChatSession>("/chatbot/sessions", {
      method: "POST",
      body: JSON.stringify({ title: title || "New Conversation" }),
    }),

  getSessionMessages: (sessionId: string) =>
    request<ChatMessage[]>(`/chatbot/sessions/${sessionId}/messages`),

  transcribeAudio: async (audioBlob: Blob, language: string = "en") => {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("language", language);

    return request<{ text: string; confidence: number; status: string }>(
      "https://audiobook-backend-latest.onrender.com/api/v1/chat/transcribe",
      {
        method: "POST",
        body: formData,
      }
    );
  },

  textToSpeech: async (text: string) => {
    const body = new URLSearchParams();
    body.append("text", text);

    return request<{ audio_url: string; status: string }>(
      "https://audiobook-backend-latest.onrender.com/api/v1/chat/tts",
      {
        method: "POST",
        body,
      }
    );
  },
};

// Audio
export interface AudioTranscribeResponse {
  id: string;
  session_id: string;
  role: string;
  content: string;
  audio_url: string;
  is_voice_message: boolean;
  created_at: string;
}

export const audio = {
  /**
   * Upload and transcribe audio file for a session
   * @param sessionId - The chat session ID
   * @param audioFile - The audio file to upload (Blob or File)
   * @param language - Language code (default: 'en')
   */
  transcribeAndUpload: async (sessionId: string, audioFile: Blob | File, language: string = "en") => {
    const formData = new FormData();

    // Determine the correct mime type
    let fileName = "audio.m4a";
    let mimeType = "audio/x-m4a";

    if (audioFile instanceof File) {
      fileName = audioFile.name;
      mimeType = audioFile.type;
    } else if (audioFile.type) {
      mimeType = audioFile.type;
      // Map common types to file extensions
      if (mimeType.includes("webm")) fileName = "audio.webm";
      else if (mimeType.includes("mp4")) fileName = "audio.mp4";
      else if (mimeType.includes("ogg")) fileName = "audio.ogg";
    }

    formData.append("file", audioFile, fileName);
    formData.append("language", language);

    return request<AudioTranscribeResponse>(`/audio/transcribe/${sessionId}`, {
      method: "POST",
      body: formData,
    });
  },

  /**
   * Get parent sessions (for children to view)
   */
  getParentSessions: () =>
    request<ChatSession[]>("/audio/parent-sessions"),

  /**
   * Download audio file for a specific message
   * @param messageId - The message ID containing the audio
   * @returns Blob of the audio file
   */
  downloadAudio: (messageId: string) =>
    requestBlob(`/audio/download/${messageId}`),

  /**
   * Get all messages with audio
   * @param params - Optional filter parameters
   */
  getMessagesWithAudio: (params?: {
    session_id?: string;
    skip?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.session_id) queryParams.append("session_id", params.session_id);
    if (params?.skip !== undefined) queryParams.append("skip", params.skip.toString());
    if (params?.limit !== undefined) queryParams.append("limit", params.limit.toString());

    const query = queryParams.toString();
    return request<ChatMessage[]>(`/audio/messages/with-audio${query ? `?${query}` : ""}`);
  },

  /**
   * Get audio messages from a specific session
   * @param sessionId - The session ID
   */
  getSessionAudioMessages: (sessionId: string) =>
    request<ChatMessage[]>(`/audio/sessions/${sessionId}/audio-messages`),

  /**
   * Get messages from a parent session (for children)
   * @param sessionId - The parent session ID
   */
  getParentSessionMessages: (sessionId: string) =>
    request<ChatSession>(`/audio/parent-sessions/${sessionId}/messages`),
};

// Monitoring
export interface SummaryResponse {
  summary: string;
}

export const monitoring = {
  getSessions: (parentId: string) =>
    request<ChatSession[]>(`/monitoring/${parentId}/sessions`),

  getMessages: (parentId: string, sessionId: string) =>
    request<ChatMessage[]>(`/monitoring/${parentId}/sessions/${sessionId}/messages`),

  summarize: (parentId: string, sessionId: string) =>
    request<SummaryResponse>(`/monitoring/${parentId}/sessions/${sessionId}/summarize`, { method: "POST" }),
};

// Family Messaging
export interface FamilyMessage {
  id: string;
  sender_id: string | null;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_system: boolean;
  audio_path?: string | null;
  audio_duration?: number | null;
  audio_mime_type?: string | null;
  audio_url?: string | null;
}

export const family = {
  sendMessage: (receiverId: string, content: string) =>
    request<FamilyMessage>(`/family/messages/${receiverId}`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  getMessages: (skip: number = 0, limit: number = 50) =>
    request<FamilyMessage[]>(`/family/messages?skip=${skip}&limit=${limit}`),

  downloadAudio: async (url: string) => {
    const isExternal = url.startsWith('http') && !url.startsWith(BASE_URL);
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

    // For external URLs, we don't send our auth token to prevent CORS/security issues
    if (isExternal) {
      const res = await fetch(fullUrl);
      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        throw new Error(`API Error ${res.status}: ${text}`);
      }
      return res.blob();
    }

    // For internal URLs, use our specialized requestBlob helper (handles 401, etc.)
    return requestBlob(fullUrl);
  }
};

// Notifications
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export const notifications = {
  getAll: (skip: number = 0, limit: number = 50, unreadOnly: boolean = false) =>
    request<Notification[]>(`/notifications?skip=${skip}&limit=${limit}&unread_only=${unreadOnly}`),

  getUnreadCount: () =>
    request<{ unread_count: number }>("/notifications/unread-count"),

  markAsRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, {
      method: "POST",
    }),

  markAllAsRead: () =>
    request<{ message: string }>("/notifications/read-all", {
      method: "POST",
    }),

  delete: (id: string) =>
    request<void>(`/notifications/${id}`, {
      method: "DELETE",
    }),

  deleteAll: () =>
    request<void>("/notifications", {
      method: "DELETE",
    }),
};
