import { Bell, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
};

interface Props {
  className?: string;
  iconClassName?: string;
}

export const NotificationBell = ({ className, iconClassName }: Props) => {
  const { data: notifications = [] } = useNotifications();
  const unread = useUnreadCount();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-full hover:bg-muted/60 transition-smooth",
            className
          )}
          aria-label="Notificações"
        >
          <Bell className={cn("h-5 w-5 text-muted-foreground", iconClassName)} />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-display text-sm font-semibold">Notificações</h3>
          {unread > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1"
              onClick={() => markAll.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Sem notificações.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => {
                const content = (
                  <div
                    className={cn(
                      "p-3 hover:bg-muted/40 cursor-pointer transition-smooth",
                      !n.read_at && "bg-primary/5"
                    )}
                    onClick={() => !n.read_at && markOne.mutate(n.id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className="text-sm font-medium leading-tight">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    {n.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    )}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? <Link to={n.link}>{content}</Link> : content}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
