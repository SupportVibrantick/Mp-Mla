import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  useTodayBirthdays,
  useUpcomingBirthdays,
  getCategoryInfo,
} from "../../hooks/useLeaders";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Cake,
  PartyPopper,
  Gift,
  ChevronRight,
  Phone,
  MessageCircle,
  CalendarDays,
  Check,
} from "lucide-react";

export default function BirthdayWidget() {
  const { data: todayRes } = useTodayBirthdays();
  const { data: upRes } = useUpcomingBirthdays(7);

  const todayList = todayRes?.data || [];
  const upcomingList = (upRes?.data || []).filter((l: any) => l.daysUntil > 0);

  if (todayList.length === 0 && upcomingList.length === 0) return null;

  return (
    <Card className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 rounded-2xl">
      {/* Celebration Header */}
      <div className="border-b border-slate-100 dark:border-slate-800/80 py-4 px-6 bg-slate-50/50 dark:bg-slate-900/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-pink-50 dark:bg-pink-950/40 text-pink-500 shadow-sm shrink-0">
              <Cake className="h-4 w-4 animate-pulse" />
            </div>
            Birthdays
          </CardTitle>
          <Link to="/leaders/birthdays">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold h-8 px-3 rounded-full border border-slate-200/60 dark:border-slate-800 shadow-sm transition-all duration-200"
            >
              View All <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </Link>
        </div>
      </div>

      <CardContent className="space-y-6 p-6">
        {/* Today */}
        {todayList.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PartyPopper className="h-4 w-4 text-rose-500 animate-bounce" />
              <span className="text-xs font-bold tracking-wider uppercase text-rose-500 dark:text-rose-400">
                TODAY ({todayList.length})
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayList.map((l: any) => {
                const cInfo = getCategoryInfo(l.category);
                const CategoryIcon = cInfo.icon;
                return (
                  <div
                    key={l.id}
                    className="flex flex-col h-full bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 hover:shadow-lg hover:border-pink-200 dark:hover:border-pink-900/30 transition-all duration-300 relative overflow-hidden group"
                  >
                    {/* Decorative top-right balloon/cake light reflection */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-pink-500/10 blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                    <div className="flex items-start gap-3.5 mb-3">
                      <div className="relative flex-shrink-0">
                        <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 shadow-sm transition-transform duration-300 group-hover:rotate-6">
                          {l.photoUrl ? (
                            <img
                              src={l.photoUrl}
                              alt={l.name}
                              className="w-12 h-12 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/80 flex items-center justify-center text-pink-650 dark:text-pink-400 font-extrabold text-base ring-2 ring-white dark:ring-slate-900">
                              {l.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow border border-pink-100 dark:border-pink-900 flex items-center justify-center">
                          <Gift className="h-3 w-3 text-pink-500" />
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link to={`/leaders/${l.id}`}>
                          <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 hover:text-pink-500 cursor-pointer transition-colors truncate">
                            {l.name}
                          </h4>
                        </Link>
                        {l.designation ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate font-medium">
                            {l.designation}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                            Representative
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Tags section */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      <span className="bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border border-pink-200/20">
                        {cInfo.label}
                      </span>
                      <span className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border border-amber-200/20">
                        Turning {l.turningAge}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      {l.greeted ? (
                        <Badge className="w-full text-center justify-center text-[10px] font-bold bg-green-500 hover:bg-green-600 text-white gap-1 py-1.5 rounded-lg shadow-sm">
                          <Check className="h-3.5 w-3.5" /> Greeted
                        </Badge>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            {l.phone && (
                              <a href={`tel:${l.phone}`} title="Call Leader">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-all hover:scale-105"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            )}
                            {l.whatsapp && (
                              <a
                                href={`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(`Happy Birthday ${l.name}!`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="WhatsApp Greet"
                              >
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg border-green-200 dark:border-green-900/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all hover:scale-105"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            )}
                          </div>
                          <Link to={`/leaders/${l.id}`} className="flex-1">
                            <Button
                              size="sm"
                              className="w-full h-8 text-[11px] font-bold gap-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-sm shadow-pink-500/20 hover:shadow-md transition-all hover:-translate-y-0.5 rounded-lg border-none"
                            >
                              <Gift className="h-3.5 w-3.5" /> Greet
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming */}
        {upcomingList.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <p className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                UPCOMING (7 DAYS)
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingList.slice(0, 6).map((l: any) => {
                const cInfo = getCategoryInfo(l.category);
                const CategoryIcon = cInfo.icon;
                return (
                  <Link to={`/leaders/${l.id}`} key={l.id}>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/60 dark:border-slate-800/80 hover:bg-white dark:hover:bg-slate-900/60 hover:border-slate-200/80 dark:hover:border-slate-700/50 hover:shadow-md transition-all duration-300 cursor-pointer">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {l.photoUrl ? (
                          <img
                            src={l.photoUrl}
                            alt={l.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200/60 dark:border-slate-850"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-150 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-650 dark:text-slate-350 border border-slate-200/60 dark:border-slate-800">
                            {l.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-850 dark:text-slate-100 truncate">
                            {l.name}
                          </p>
                          <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5 font-semibold">
                            <CategoryIcon className="h-3 w-3 flex-shrink-0" />
                            {cInfo.label} · Turn {l.turningAge}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0",
                          l.daysUntil === 1
                            ? "bg-rose-500/10 text-rose-600 border border-rose-200/30 dark:bg-rose-500/25 dark:text-rose-450 dark:border-rose-500/20"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none",
                        )}
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
