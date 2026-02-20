import { Link } from "wouter";
import {
  useTodayBirthdays,
  useUpcomingBirthdays,
  getCategoryInfo,
} from "@/hooks/useLeaders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Cake,
  PartyPopper,
  Gift,
  ChevronRight,
  Phone,
  MessageCircle,
} from "lucide-react";

export default function BirthdayWidget() {
  const { data: todayRes } = useTodayBirthdays();
  const { data: upRes } = useUpcomingBirthdays(7);

  const todayList = todayRes?.data || [];
  const upcomingList = (upRes?.data || []).filter((l: any) => l.daysUntil > 0);

  if (todayList.length === 0 && upcomingList.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-pink-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" /> Birthdays
          </CardTitle>
          <Link to="/leaders/birthdays">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Today */}
        {todayList.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PartyPopper className="h-4 w-4 text-yellow-500" />
              <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                TODAY ({todayList.length})
              </span>
            </div>
            {todayList.map((l: any) => {
              const cInfo = getCategoryInfo(l.category);
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-gradient-to-r from-pink-50 to-yellow-50 dark:from-pink-950/30 dark:to-yellow-950/20 border border-pink-200/50 dark:border-pink-800/30 mb-2"
                >
                  <div className="relative">
                    {l.photoUrl ? (
                      <img
                        src={l.photoUrl}
                        alt={l.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center text-pink-600 font-bold text-sm">
                        {l.name.charAt(0)}
                      </div>
                    )}
                    <span className="absolute -top-1 -right-1 text-sm">🎂</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/leaders/${l.id}`}>
                      <p className="font-semibold text-sm hover:text-primary cursor-pointer truncate">
                        {l.name}
                      </p>
                    </Link>
                    <p className="text-[10px] text-muted-foreground">
                      {cInfo.icon} {cInfo.label}
                      {l.designation ? ` • ${l.designation}` : ""}
                      {` • Turning ${l.turningAge}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {l.greeted ? (
                      <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        ✓ Greeted
                      </Badge>
                    ) : (
                      <>
                        {l.phone && (
                          <a href={`tel:${l.phone}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        {l.whatsapp && (
                          <a
                            href={`https://wa.me/${l.whatsapp}?text=Happy Birthday ${l.name}! 🎂🎉`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-green-600"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        <Link to={`/leaders/${l.id}`}>
                          <Button
                            size="sm"
                            className="h-7 text-[10px] gap-1 bg-pink-600 hover:bg-pink-700"
                          >
                            <Gift className="h-3 w-3" /> Greet
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Upcoming */}
        {upcomingList.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              UPCOMING (7 DAYS)
            </p>
            <div className="space-y-1.5">
              {upcomingList.slice(0, 5).map((l: any) => {
                const cInfo = getCategoryInfo(l.category);
                return (
                  <Link to={`/leaders/${l.id}`} key={l.id}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {l.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {cInfo.icon} {cInfo.label} • Turning {l.turningAge}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] flex-shrink-0"
                      >
                        {l.daysUntil === 1 ? "Tomorrow" : `${l.daysUntil} days`}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
