import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { 
  Bell, 
  CheckCircle2, 
  MessageCircle, 
  Star, 
  AlertCircle, 
  Bot, 
  Trash2,
  Filter,
  MoreVertical,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { notifications as apiNotifications } from '@/lib/api';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'FAMILY_MESSAGE':
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'CHATBOT_ACTIVITY':
      return <Bot className="h-5 w-5 text-purple-500" />;
    case 'SYSTEM_GREETING':
      return <Star className="h-5 w-5 text-amber-500 fill-amber-500/20" />;
    case 'INACTIVITY_WARNING':
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    default:
      return <Bell className="h-5 w-5 text-primary" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'FAMILY_MESSAGE': return 'bg-blue-500/10';
    case 'CHATBOT_ACTIVITY': return 'bg-purple-500/10';
    case 'SYSTEM_GREETING': return 'bg-amber-500/10';
    case 'INACTIVITY_WARNING': return 'bg-orange-500/10';
    default: return 'bg-primary/10';
  }
};

const formatFullDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function Notifications() {
  const { unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications } = useNotifications();
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchAndRefresh = async () => {
    setIsLoading(true);
    try {
      const data = await apiNotifications.getAll(0, 50, filter === 'unread');
      setAllNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndRefresh();
  }, [filter]);

  const handleMarkAsRead = async (id: string) => {
    // Optimistic update
    setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await markAsRead(id);
    } catch (error) {
      // Refresh on error
      fetchAndRefresh();
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setAllNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (error) {
      // Refresh on error
      fetchAndRefresh();
    }
  };

  const handleMarkAndDelete = async () => {
    // Optimistic update
    setAllNotifications([]);
    try {
      await deleteAllNotifications();
    } catch (error) {
      fetchAndRefresh();
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="bg-primary text-primary-foreground h-6 px-2 text-xs rounded-full">
                  {unreadCount} New
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground font-body">Stay updated with your family activity and system status.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="bg-muted p-1 rounded-lg flex items-center gap-1">
                <Button 
                   variant={filter === 'all' ? 'secondary' : 'ghost'} 
                   size="sm" 
                   onClick={() => setFilter('all')}
                   className="h-8 text-xs px-3"
                >
                   All
                </Button>
                <Button 
                   variant={filter === 'unread' ? 'secondary' : 'ghost'} 
                   size="sm" 
                   onClick={() => setFilter('unread')}
                   className="h-8 text-xs px-3"
                >
                   Unread
                </Button>
             </div>
             
             <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAndDelete}
                disabled={allNotifications.length === 0}
                className="h-10 px-4 gap-2 border-border/60 hover:bg-destructive/5 hover:text-destructive transition-all rounded-xl shadow-sm"
             >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Delete all</span>
             </Button>
          </div>
        </div>

        <Card className="border-border/40 shadow-warm overflow-hidden bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {isLoading && allNotifications.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                 <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                 <p className="text-muted-foreground text-sm font-body animate-pulse">Loading notifications...</p>
              </div>
            ) : allNotifications.length > 0 ? (
              <div className="divide-y divide-border/30">
                <AnimatePresence initial={false} mode="popLayout">
                  {allNotifications.map((notif, idx) => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`group flex items-start gap-5 p-6 transition-all hover:bg-muted/30 relative ${!notif.is_read ? 'bg-primary/5 shadow-[inset_4px_0_0_0_var(--primary)]' : ''}`}
                    >
                      <div className={`flex-shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm ${getNotificationColor(notif.notification_type)}`}>
                        {getNotificationIcon(notif.notification_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-8">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-base font-bold truncate ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title}
                          </h4>
                          {!notif.is_read && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                        </div>
                        <p className={`text-sm leading-relaxed mb-3 ${!notif.is_read ? 'text-foreground/80' : 'text-muted-foreground/80'}`}>
                          {notif.content}
                        </p>
                        <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                           <span>{formatFullDate(notif.created_at)}</span>
                           <span>•</span>
                           <span className="bg-muted px-2 py-0.5 rounded uppercase">{notif.notification_type.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background shadow-sm border border-border/20">
                                  <MoreVertical className="h-4 w-4" />
                               </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-md border-border/40">
                               <DropdownMenuItem onClick={() => handleMarkAsRead(notif.id)} disabled={notif.is_read} className="gap-2 focus:bg-primary/10">
                                  <CheckCircle className="h-4 w-4 text-primary" /> Mark as read
                               </DropdownMenuItem>
                               <DropdownMenuItem onClick={() => handleDelete(notif.id)} className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                                  <Trash2 className="h-4 w-4" /> Delete
                               </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-32 flex flex-col items-center justify-center text-center px-6">
                <div className="h-24 w-24 rounded-3xl bg-muted/50 flex items-center justify-center mb-6 relative">
                   <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-xl animate-pulse" />
                   <Bell className="h-12 w-12 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">No notifications found</h3>
                <p className="text-muted-foreground text-sm max-w-[280px] leading-relaxed mx-auto">
                   {filter === 'unread' 
                      ? "You've read all your notifications! Check back later for updates." 
                      : "Your inbox is empty. We'll notify you here about family activity and more."}
                </p>
                {filter === 'unread' && (
                   <Button variant="link" onClick={() => setFilter('all')} className="mt-4 text-primary font-semibold">
                      View all notifications
                   </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {allNotifications.length > 0 && (
           <div className="flex justify-center py-4">
              <p className="text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border/40">
                Displaying the most recent 50 notifications
              </p>
           </div>
        )}
      </motion.div>
    </div>
  );
}
