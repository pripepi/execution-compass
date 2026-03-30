import React from "react";
import { MessageSquare, CheckCircle, ArrowRightLeft, UserPlus, Clock, AlertTriangle, Edit } from "lucide-react";

interface TimelineEvent {
  id: string;
  type: "status" | "comment" | "allocation" | "edit" | "mobility" | "alert";
  title: string;
  description: string;
  user: string;
  timestamp: string;
}

const eventConfig = {
  status: { icon: CheckCircle, colorClass: "text-status-success bg-status-success-muted border-status-success/20" },
  comment: { icon: MessageSquare, colorClass: "text-status-info bg-status-info-muted border-status-info/20" },
  allocation: { icon: UserPlus, colorClass: "text-primary bg-primary/8 border-primary/20" },
  edit: { icon: Edit, colorClass: "text-muted-foreground bg-muted border-border" },
  mobility: { icon: ArrowRightLeft, colorClass: "text-status-warning bg-status-warning-muted border-status-warning/20" },
  alert: { icon: AlertTriangle, colorClass: "text-status-danger bg-status-danger-muted border-status-danger/20" },
};

interface ActivityTimelineProps {
  events: TimelineEvent[];
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <div className="relative">
      <div className="absolute left-[15px] top-4 bottom-4 w-px bg-border" />
      <div className="space-y-5">
        {events.map((event) => {
          const config = eventConfig[event.type];
          const Icon = config.icon;
          return (
            <div key={event.id} className="relative flex gap-3.5 pl-0">
              <div className={`relative z-10 w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${config.colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-[13px] font-medium text-foreground">{event.title}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">{event.description}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-muted-foreground font-medium">{event.user}</span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground font-data">{event.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { TimelineEvent };
