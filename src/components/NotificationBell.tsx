import React from 'react';
import { 
  Bell, 
  CheckCircle2, 
  MessageCircle, 
  Star, 
  AlertCircle, 
  Bot, 
  Settings2,
  Trash2,
  Trash
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

import { Link } from 'react-router-dom';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'FAMILY_MESSAGE':
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case 'CHATBOT_ACTIVITY':
      return <Bot className="h-4 w-4 text-purple-500" />;
    case 'SYSTEM_GREETING':
      return <Star className="h-4 w-4 text-amber-500 fill-amber-500/20" />;
    case 'INACTIVITY_WARNING':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4 text-primary" />;
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

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export function NotificationBell() {
  const { unreadCount, recentNotifications, markAsRead, deleteNotification, deleteAllNotifications } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative transition-all hover:bg-primary/5 active:scale-95 group">
          <motion.div
            animate={unreadCount > 0 ? {
              rotate: [0, -10, 10, -10, 10, 0],
            } : {}}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 5 }}
          >
            <Bell className="h-5 w-5 text-foreground/70 group-hover:text-primary transition-colors" />
          </motion.div>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground shadow-sm ring-2 ring-background pointer-events-none"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-[380px] p-0 shadow-2xl border-border/40 overflow-hidden bg-card/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="p-0 text-base font-display font-bold">Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] h-4 px-1.5">
                {unreadCount} New
              </Badge>
            )}
          </div>
          {recentNotifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                deleteAllNotifications();
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-full flex items-center gap-1.5"
            >
              <Trash className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>
        
        <DropdownMenuSeparator className="m-0 bg-border/40" />
        
        <ScrollArea className="h-[420px]">
          {recentNotifications.length > 0 ? (
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {recentNotifications.map((notif, idx) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`group relative flex cursor-pointer gap-4 px-5 py-4 transition-all hover:bg-muted/50 border-b border-border/30 last:border-0 ${!notif.is_read ? 'bg-primary/5 shadow-[inset_4px_0_0_0_var(--primary)]' : ''}`}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                  >
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${getNotificationColor(notif.notification_type)}`}>
                      {getNotificationIcon(notif.notification_type)}
                    </div>
                    
                    <div className="flex flex-col gap-1 flex-1 min-w-0 pr-6">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-sm font-semibold truncate leading-tight ${!notif.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap pt-0.5">
                          {timeAgo(notif.created_at)}
                        </span>
                      </div>
                      <span className={`text-xs leading-normal line-clamp-2 ${!notif.is_read ? 'text-foreground/80' : 'text-muted-foreground/70'}`}>
                        {notif.content}
                      </span>
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                       <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                             e.stopPropagation();
                             deleteNotification(notif.id);
                          }}
                          className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                       >
                          <Trash2 className="h-3.5 w-3.5" />
                       </Button>
                       {!notif.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 group-hover:hidden" />
                       )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-[300px] flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <Bell className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-background border-2 border-muted flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-1">All Caught Up!</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
                No new notifications at the moment. We'll let you know when something important happens.
              </p>
            </motion.div>
          )}
        </ScrollArea>
        
        {recentNotifications.length > 0 && (
          <div className="p-3 bg-muted/20 border-t border-border/40 text-center">
             <Link to="/notifications">
               <Button variant="link" size="sm" className="text-xs font-semibold text-primary hover:no-underline opacity-70 hover:opacity-100 transition-opacity">
                  See all notifications
               </Button>
             </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

