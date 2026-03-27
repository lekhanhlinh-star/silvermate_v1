import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notifications, Notification, WS_URL } from "@/lib/api";
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

interface NotificationContextType {
  unreadCount: number;
  recentNotifications: Notification[];
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  fetchRecent: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  recentNotifications: [],
  refreshUnreadCount: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  deleteAllNotifications: async () => {},
  fetchRecent: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<Notification[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchRecent = useCallback(async () => {
    if (!token) return;
    try {
      const data = await notifications.getAll(0, 10, false);
      setRecentNotifications(data);
    } catch (error) {
      console.error("Failed to fetch recent notifications:", error);
    }
  }, [token]);

  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await notifications.getUnreadCount();
      setUnreadCount(res.unread_count);
    } catch (error) {
      console.error("Failed to get unread count:", error);
    }
  }, [token]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notifications.markAsRead(id);
      setRecentNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      // Refresh count from server to be 100% sure
      refreshUnreadCount();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, [refreshUnreadCount]);

  const markAllAsRead = useCallback(async () => {
    try {
      await notifications.markAllAsRead();
      setRecentNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      refreshUnreadCount(); // Double check
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [refreshUnreadCount]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setRecentNotifications(prev => prev.filter(n => n.id !== id));
      
      await notifications.delete(id);
      // Sync unread count from server after deletion
      refreshUnreadCount();
    } catch (error) {
      console.error("Failed to delete notification:", error);
      // Re-fetch on error to revert optimistic change
      fetchRecent();
    }
  }, [notifications, refreshUnreadCount, fetchRecent]);

  const deleteAllNotifications = useCallback(async () => {
    try {
      // Optimistic update
      setRecentNotifications([]);
      setUnreadCount(0);
      
      await notifications.deleteAll();
      refreshUnreadCount();
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
      fetchRecent();
      refreshUnreadCount();
    }
  }, [notifications, refreshUnreadCount, fetchRecent]);

  // Initialize data
  useEffect(() => {
    if (user && token) {
      refreshUnreadCount();
      fetchRecent();
    } else {
      setUnreadCount(0);
      setRecentNotifications([]);
    }
  }, [user, token, refreshUnreadCount, fetchRecent]);

  // WebSocket Connection with auto-reconnect
  useEffect(() => {
    if (!token || !user) return;

    let ws: WebSocket;
    let pingInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;
    let reconnectDelay = 3000; // Start at 3s, exponential backoff
    let isMounted = true;
    
    const wsBaseUrl = import.meta.env.VITE_WS_URL || WS_URL;

    const connect = () => {
      if (!isMounted) return;

      const wsUrl = `${wsBaseUrl}/notifications/ws?token=${token}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected for notifications");
        reconnectDelay = 3000; // Reset backoff on successful connect
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        if (event.data === "pong") return;
        
        try {
          const newNotif: Notification = JSON.parse(event.data);
          
          // Modified toast for better UI
          toast(newNotif.title, {
            description: newNotif.content,
            duration: 6000,
            icon: (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center -ml-1 mr-1">
                 <Bell className="h-3.5 w-3.5 text-primary" />
              </div>
            ),
            className: "border-border/60 bg-card/95 backdrop-blur-md shadow-2xl rounded-2xl",
          });

          setUnreadCount(prev => prev + 1);
          setRecentNotifications(prev => {
            const newList = [newNotif, ...prev];
            return newList.slice(0, 50);
          });
        } catch (error) {
          console.error("Failed to parse websocket message:", error, event.data);
        }
      };

      ws.onclose = () => {
        console.log("❌ WebSocket disconnected");
        clearInterval(pingInterval);
        if (isMounted) {
          console.log(`Reconnecting in ${reconnectDelay / 1000}s...`);
          reconnectTimeout = setTimeout(connect, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 30000); // Max 30s
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close(); // Triggers onclose → reconnect
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [token, user]);

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      recentNotifications,
      refreshUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      deleteAllNotifications,
      fetchRecent
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
