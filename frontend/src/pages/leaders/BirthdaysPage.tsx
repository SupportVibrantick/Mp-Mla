import { useState } from "react";
import { Link } from "wouter";
import {
  useTodayBirthdays,
  useUpcomingBirthdays,
  useThisMonthBirthdays,
  useSendGreeting,
  useSendBulkGreeting,
  getCategoryInfo,
} from "@/hooks/useLeaders";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Cake,
  PartyPopper,
  Gift,
  Phone,
  MessageCircle,
  Mail,
  Send,
  Loader2,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";

const GREETING_TEMPLATES = [
  {
    label: "Formal Birthday",
    message:
      "Respected {name}, wishing you a very Happy Birthday! 🎂 May this year bring you great health, happiness, and success. Warm regards.",
  },
  {
    label: "Warm Birthday",
    message:
      "Dear {name}, Happy Birthday! 🎉🎂 Wishing you a wonderful year ahead filled with joy and achievements. Many happy returns of the day!",
  },
  {
    label: "Short & Sweet",
    message:
      "Happy Birthday {name}! 🎂🎉 Wishing you a fantastic day and a wonderful year ahead!",
  },
  {
    label: "Official",
    message:
      "On behalf of our office, we extend our heartiest birthday wishes to {name}. May you continue to inspire and lead. Happy Birthday! 🎂",
  },
];

export default function BirthdaysPage() {
  const { data: todayRes } = useTodayBirthdays();
  const { data: upRes } = useUpcomingBirthdays(30);
  const { data: monthRes } = useThisMonthBirthdays();
  const greetMut = useSendGreeting();
  const bulkMut = useSendBulkGreeting();

  const [greetDlg, setGreetDlg] = useState(false);
  const [greetTarget, setGreetTarget] = useState<any>(null);
  const [gf, setGf] = useState({ channel: "EMAIL" as string, message: "" });
  const [bulkDlg, setBulkDlg] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bf, setBf] = useState({ channel: "EMAIL" as string, message: "" });

  const todayList = todayRes?.data || [];
  const upcomingList = (upRes?.data || []).filter((l: any) => l.daysUntil > 0);
  const monthList = monthRes?.data || [];

  const openGreet = (leader: any) => {
    setGreetTarget(leader);
    setGf({
      channel: "EMAIL",
      message: GREETING_TEMPLATES[0].message
        .replace(/\{name\}/g, leader.name)
        .replace(/\{age\}/g, String(leader.turningAge || leader.age)),
    });
    setGreetDlg(true);
  };

  const sendSingle = async () => {
    if (!greetTarget || !gf.message) return;
    await greetMut.mutateAsync({
      id: greetTarget.id,
      data: { type: "BIRTHDAY", channel: gf.channel, message: gf.message },
    });
    setGreetDlg(false);
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const selectAll = () => {
    const allIds = todayList
      .filter((l: any) => !l.greeted)
      .map((l: any) => l.id);
    setSelectedIds(allIds);
  };

  const openBulk = () => {
    setBf({ channel: "EMAIL", message: GREETING_TEMPLATES[0].message });
    setBulkDlg(true);
  };
  const sendBulk = async () => {
    if (selectedIds.length === 0 || !bf.message) return;
    await bulkMut.mutateAsync({
      leaderIds: selectedIds,
      type: "BIRTHDAY",
      channel: bf.channel,
      message: bf.message,
    });
    setBulkDlg(false);
    setSelectedIds([]);
  };

  const renderLeaderCard = (l: any, showGreet = true) => {
    const cInfo = getCategoryInfo(l.category);
    const Icon = cInfo.icon;

    return (
      <div
        key={l.id}
        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${
          l.isBirthdayToday || l.isToday
            ? "bg-gradient-to-r from-pink-500/5 to-yellow-500/5 border-pink-200 dark:border-pink-800/40 hover:border-pink-300"
            : "bg-card border-border/50 hover:border-primary/25 hover:shadow-sm"
        }`}
      >
        {showGreet && l.isBirthdayToday && (
          <Checkbox
            checked={selectedIds.includes(l.id)}
            onCheckedChange={() => toggleSelect(l.id)}
            className="mr-1"
          />
        )}
        <div className="relative flex-shrink-0">
          {l.photoUrl ? (
            <img
              src={l.photoUrl}
              alt={l.name}
              className="w-11 h-11 rounded-full object-cover border border-border/40 shadow-sm"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
              {l.name.charAt(0)}
            </div>
          )}
          {(l.isBirthdayToday || l.isToday) && (
            <span className="absolute -top-1 -right-1 text-xs">🎂</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/leaders/${l.id}`}>
            <p className="font-bold text-xs sm:text-sm hover:text-primary cursor-pointer truncate text-foreground">
              {l.name}
            </p>
          </Link>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold truncate mt-0.5">
            <Icon className="h-3 w-3" />
            {cInfo.label}
            {l.designation ? ` • ${l.designation}` : ""}
            {l.organization ? ` • ${l.organization}` : ""}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
            {format(new Date(l.dateOfBirth), "dd MMM yyyy")} •{" "}
            {l.turningAge || l.age} years old
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {l.daysUntil !== undefined && l.daysUntil > 0 ? (
            <Badge variant="outline" className="text-[10px] font-bold">
              {l.daysUntil === 1 ? "Tomorrow" : `${l.daysUntil} days`}
            </Badge>
          ) : l.isPast ? (
            <Badge variant="secondary" className="text-[10px] font-bold bg-muted/50">
              {l.day}{" "}
              {format(
                new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  l.day,
                ),
                "MMM",
              )}
            </Badge>
          ) : null}
          {(l.isBirthdayToday || l.isToday) &&
            showGreet &&
            (l.greeted ? (
              <Badge className="text-[10px] font-bold bg-green-500/10 text-green-500 border-none">
                ✓ Greeted
              </Badge>
            ) : (
              <Button
                size="sm"
                className="h-7 text-[10px] gap-1 bg-pink-600 hover:bg-pink-700 font-bold border-none"
                onClick={() => openGreet(l)}
              >
                <Gift className="h-3 w-3" />
                Greet
              </Button>
            ))}
          {l.ward && (
            <span className="text-[10px] text-muted-foreground font-semibold">
              #{l.ward.wardNumber} {l.ward.name}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <MainLayout title="Birthdays">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
              <Cake className="h-7 w-7 text-pink-500" />
              Birthday Reminders
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Never miss a local representative's birthday
            </p>
          </div>
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            {selectedIds.length > 0 && (
              <Button
                className="gap-1.5 text-xs bg-pink-600 hover:bg-pink-700 font-bold border-none"
                onClick={openBulk}
              >
                <Send className="h-3.5 w-3.5" />
                Greet {selectedIds.length} Selected
              </Button>
            )}
            <Link to="/leaders">
              <Button variant="outline" className="text-xs border-border/60 bg-card font-bold">All Representatives</Button>
            </Link>
          </div>
        </div>

        <Tabs defaultValue="today">
          <TabsList className="flex w-full overflow-x-auto gap-1 sm:grid sm:grid-cols-3 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="today" className="gap-1.5 text-xs font-bold rounded-lg">
              <PartyPopper className="h-3.5 w-3.5" />
              Today ({todayList.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-1.5 text-xs font-bold rounded-lg">
              <Calendar className="h-3.5 w-3.5" />
              Upcoming 30 Days
            </TabsTrigger>
            <TabsTrigger value="month" className="gap-1.5 text-xs font-bold rounded-lg">
              <Cake className="h-3.5 w-3.5" />
              This Month
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="mt-4 space-y-3">
            {todayList.length === 0 ? (
              <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="py-16 text-center">
                  <Cake className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground text-xs font-semibold">No birthdays today</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-pink-600 flex items-center gap-2">
                    <PartyPopper className="h-4 w-4 animate-bounce" />
                    {todayList.length} birthday{todayList.length > 1 ? "s" : ""}{" "}
                    today!
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold"
                    onClick={selectAll}
                  >
                    Select All Ungreeted
                  </Button>
                </div>
                {todayList.map((l: any) => renderLeaderCard(l, true))}
              </>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="mt-4 space-y-2">
            {upcomingList.length === 0 ? (
              <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="py-16 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground text-xs font-semibold">
                    No upcoming birthdays in next 30 days
                  </p>
                </CardContent>
              </Card>
            ) : (
              upcomingList.map((l: any) => renderLeaderCard(l, false))
            )}
          </TabsContent>

          <TabsContent value="month" className="mt-4 space-y-2">
            {monthList.length === 0 ? (
              <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
                <CardContent className="py-16 text-center">
                  <Cake className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground text-xs font-semibold">
                    No birthdays this month
                  </p>
                </CardContent>
              </Card>
            ) : (
              monthList.map((l: any) => renderLeaderCard(l, false))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Single Greeting Dialog */}
      <Dialog open={greetDlg} onOpenChange={setGreetDlg}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-500" />
              Send Birthday Greeting — {greetTarget?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                onValueChange={(v) => {
                  const t = GREETING_TEMPLATES[parseInt(v)];
                  setGf((p) => ({
                    ...p,
                    message: t.message
                      .replace(/\{name\}/g, greetTarget?.name || "")
                      .replace(
                        /\{age\}/g,
                        String(greetTarget?.turningAge || ""),
                      ),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {GREETING_TEMPLATES.map((t, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Send Via</Label>
              <Select
                value={gf.channel}
                onValueChange={(v) => setGf((p) => ({ ...p, channel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">📧 Email</SelectItem>
                  <SelectItem value="WHATSAPP">💬 WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={gf.message}
                onChange={(e) =>
                  setGf((p) => ({ ...p, message: e.target.value }))
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGreetDlg(false)}>
              Cancel
            </Button>
            <Button
              disabled={greetMut.isPending || !gf.message}
              onClick={sendSingle}
              className="gap-1.5 bg-pink-600 hover:bg-pink-700 text-white font-bold border-none"
            >
              {greetMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Greeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Greeting Dialog */}
      <Dialog open={bulkDlg} onOpenChange={setBulkDlg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Bulk Birthday Greeting ({selectedIds.length} local representatives)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                onValueChange={(v) =>
                  setBf((p) => ({
                    ...p,
                    message: GREETING_TEMPLATES[parseInt(v)].message,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {GREETING_TEMPLATES.map((t, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Send Via</Label>
              <Select
                value={bf.channel}
                onValueChange={(v) => setBf((p) => ({ ...p, channel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">📧 Email</SelectItem>
                  <SelectItem value="WHATSAPP">💬 WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={bf.message}
                onChange={(e) =>
                  setBf((p) => ({ ...p, message: e.target.value }))
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDlg(false)}>
              Cancel
            </Button>
            <Button
              disabled={bulkMut.isPending}
              onClick={sendBulk}
              className="gap-1.5 bg-pink-600 hover:bg-pink-700 text-white font-bold border-none"
            >
              {bulkMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send to {selectedIds.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
