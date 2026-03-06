import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useLeader,
  useDeleteLeader,
  useSendGreeting,
  getCategoryInfo,
} from "@/hooks/useLeaders";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Globe,
  Cake,
  PartyPopper,
  Gift,
  Star,
  Shield,
  Send,
  Loader2,
  Calendar,
  Facebook,
  Twitter,
  Instagram,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";

const GREETING_TEMPLATES = [
  {
    label: "Formal Birthday",
    message:
      "Respected {name}, wishing you a very Happy Birthday! 🎂 May this year bring you great health, happiness, and success in all your endeavors. Warm regards.",
  },
  {
    label: "Warm Birthday",
    message:
      "Dear {name}, Happy Birthday! 🎉🎂 Wishing you a wonderful year ahead filled with joy, prosperity, and great achievements. Many happy returns of the day!",
  },
  {
    label: "Short & Sweet",
    message:
      "Happy Birthday {name}! 🎂🎉 Wishing you a fantastic day and a wonderful year ahead!",
  },
  {
    label: "Official",
    message:
      "On behalf of our office, we extend our heartiest birthday wishes to {name}. May you continue to inspire and lead our community. Happy Birthday! 🎂",
  },
];

const GREETING_STATUS_STYLES: Record<
  string,
  { color: string; Icon: any; label: string }
> = {
  SENT: { color: "text-green-600", Icon: CheckCircle2, label: "Sent" },
  DELIVERED: { color: "text-blue-600", Icon: CheckCircle2, label: "Delivered" },
  PENDING: { color: "text-amber-600", Icon: Clock, label: "Pending" },
  FAILED: { color: "text-red-600", Icon: XCircle, label: "Failed" },
};

const CHANNEL_ICONS: Record<string, { icon: string; label: string }> = {
  WHATSAPP: { icon: "💬", label: "WhatsApp" },
  SMS: { icon: "📱", label: "SMS" },
  EMAIL: { icon: "📧", label: "Email" },
  IN_APP: { icon: "🔔", label: "In-App" },
};

const INFLUENCE_DISPLAY: Record<
  string,
  { dots: string; color: string; bg: string }
> = {
  High: {
    dots: "●●●",
    color: "text-red-600",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  Medium: {
    dots: "●●○",
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/30",
  },
  Low: {
    dots: "●○○",
    color: "text-green-600",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
};

const RELATION_STYLES: Record<string, string> = {
  Supporter:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Alliance: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Neutral: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  Opposition: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function LeaderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { data: res, isLoading } = useLeader(id);
  const deleteMut = useDeleteLeader();
  const greetMut = useSendGreeting();

  const [greetDlg, setGreetDlg] = useState(false);
  const [gf, setGf] = useState({ channel: "WHATSAPP", message: "" });

  const l = res?.data;

  if (isLoading) {
    return (
      <MainLayout title="Leader">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );
  }

  if (!l) {
    return (
      <MainLayout title="Leader">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p>Leader not found</p>
          <Link to="/leaders">
            <Button variant="outline">Back to Leaders</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const cInfo = getCategoryInfo(l.category);
  const dob = new Date(l.dateOfBirth);
  const infDisplay = INFLUENCE_DISPLAY[l.influence] || null;

  const openGreet = () => {
    const msg = GREETING_TEMPLATES[0].message
      .replace(/\{name\}/g, l.name)
      .replace(/\{age\}/g, String(l.age + (l.isBirthdayToday ? 0 : 1)));
    setGf({ channel: "WHATSAPP", message: msg });
    setGreetDlg(true);
  };

  const sendSingle = async () => {
    if (!id || !gf.message) return;
    await greetMut.mutateAsync({
      id,
      data: { type: "BIRTHDAY", channel: gf.channel, message: gf.message },
    });
    setGreetDlg(false);
  };

  return (
    <MainLayout title="Leader">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* ─── Header ──────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link to="/leaders">
              <Button variant="ghost" size="icon" className="h-9 w-9 mt-1">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              {l.photoUrl ? (
                <img
                  src={l.photoUrl}
                  alt={l.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold border-2 border-primary/20">
                  {l.name
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  {l.name}
                  {l.isBirthdayToday && <span className="text-xl">🎂</span>}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs gap-1">
                    <span>{cInfo.icon}</span> {cInfo.label}
                  </Badge>
                  {l.relation && (
                    <Badge
                      className={`text-[10px] ${RELATION_STYLES[l.relation] || ""}`}
                    >
                      {l.relation}
                    </Badge>
                  )}
                  {infDisplay && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono ${infDisplay.color}`}
                    >
                      {infDisplay.dots} {l.influence}
                    </Badge>
                  )}
                  {!l.isActive && (
                    <Badge variant="destructive" className="text-[10px]">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {[l.designation, l.organization, l.partyName]
                    .filter(Boolean)
                    .join(" • ") || "No designation"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <PermissionGate module="leaders" action="update">
              <Link to={`/leaders/${l.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate module="leaders" action="delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Remove &quot;{l.name}&quot;?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all associated greeting history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive"
                      onClick={async () => {
                        await deleteMut.mutateAsync(l.id);
                        navigate("/leaders");
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        </div>

        {/* ─── Birthday Card ───────────────────────────── */}
        <Card
          className={`border-2 ${
            l.isBirthdayToday
              ? "border-pink-300 dark:border-pink-700 bg-gradient-to-r from-pink-50 via-yellow-50 to-pink-50 dark:from-pink-950/30 dark:via-yellow-950/20 dark:to-pink-950/30"
              : l.daysUntilBirthday <= 7
                ? "border-amber-200 dark:border-amber-800"
                : ""
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
                    l.isBirthdayToday
                      ? "bg-pink-100 dark:bg-pink-900/40"
                      : "bg-muted"
                  }`}
                >
                  {l.isBirthdayToday ? "🎉" : "🎂"}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Date of Birth
                  </p>
                  <p className="text-xl font-bold">
                    {format(dob, "dd MMMM yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {l.age} years old
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {l.isBirthdayToday ? (
                  <>
                    <Badge className="bg-pink-600 text-white text-sm px-3 py-1 gap-1.5">
                      <PartyPopper className="h-4 w-4" />
                      🎂 Birthday TODAY!
                    </Badge>
                    {l.birthdayGreetedThisYear ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                        ✓ Already greeted this year
                      </Badge>
                    ) : (
                      <div className="flex gap-2">
                        {l.whatsapp && (
                          <a
                            href={`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(`Happy Birthday ${l.name}! 🎂🎉 Wishing you a wonderful year ahead!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-green-600 border-green-300"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                          </a>
                        )}
                        <Button
                          size="sm"
                          className="gap-1.5 bg-pink-600 hover:bg-pink-700"
                          onClick={openGreet}
                        >
                          <Gift className="h-3.5 w-3.5" /> Send Greeting
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Next birthday
                    </p>
                    <p className="text-lg font-bold">
                      {l.daysUntilBirthday === 1
                        ? "Tomorrow!"
                        : `In ${l.daysUntilBirthday} days`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(l.nextBirthday), "EEEE, dd MMM yyyy")}
                      {" — "}Turning {l.age + 1}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Contact + Classification ────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  icon: Phone,
                  label: "Phone",
                  value: l.phone,
                  href: `tel:${l.phone}`,
                },
                {
                  icon: MessageCircle,
                  label: "WhatsApp",
                  value: l.whatsapp,
                  href: `https://wa.me/${l.whatsapp}`,
                  external: true,
                },
                {
                  icon: Phone,
                  label: "Alt Phone",
                  value: l.altPhone,
                  href: `tel:${l.altPhone}`,
                },
                {
                  icon: Mail,
                  label: "Email",
                  value: l.email,
                  href: `mailto:${l.email}`,
                },
                { icon: MapPin, label: "Address", value: l.address },
              ]
                .filter((c) => c.value)
                .map((c) => (
                  <div key={c.label} className="flex items-start gap-3 text-sm">
                    <c.icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        {c.label}
                      </p>
                      {c.href ? (
                        <a
                          href={c.href}
                          {...(c.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="text-primary hover:underline"
                        >
                          {c.value}
                        </a>
                      ) : (
                        <p>{c.value}</p>
                      )}
                    </div>
                  </div>
                ))}

              {l.ward && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Ward</p>
                    <Link to={`/wards/${l.ward.id}`}>
                      <p className="text-primary hover:underline cursor-pointer">
                        #{l.ward.wardNumber} {l.ward.name}
                      </p>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Category</p>
                  <Badge variant="secondary" className="mt-1 gap-1">
                    <span>{cInfo.icon}</span> {cInfo.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Gender</p>
                  <p className="text-sm font-medium mt-1">{l.gender || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Relation</p>
                  {l.relation ? (
                    <Badge
                      className={`mt-1 text-xs ${RELATION_STYLES[l.relation] || ""}`}
                    >
                      {l.relation}
                    </Badge>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">—</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Influence</p>
                  {infDisplay ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`font-mono text-lg tracking-widest ${infDisplay.color}`}
                      >
                        {infDisplay.dots}
                      </span>
                      <span className="text-sm font-medium">{l.influence}</span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">—</p>
                  )}
                </div>
              </div>

              {/* Social Links */}
              {(l.facebookUrl || l.twitterUrl || l.instagramUrl) && (
                <div className="pt-3 border-t">
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Social Profiles
                  </p>
                  <div className="flex gap-2">
                    {l.facebookUrl && (
                      <a
                        href={l.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                        >
                          <Facebook className="h-4 w-4 text-blue-600" />
                        </Button>
                      </a>
                    )}
                    {l.twitterUrl && (
                      <a
                        href={l.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                        >
                          <Twitter className="h-4 w-4 text-sky-500" />
                        </Button>
                      </a>
                    )}
                    {l.instagramUrl && (
                      <a
                        href={l.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                        >
                          <Instagram className="h-4 w-4 text-pink-500" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {l.tags && l.tags.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-[10px] text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {l.tags.map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Notes ───────────────────────────────────── */}
        {l.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{l.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* ─── Greeting History ─────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-500" /> Greeting History
            </CardTitle>
            <PermissionGate module="leaders" action="update">
              <Button
                size="sm"
                className="gap-1.5 bg-pink-600 hover:bg-pink-700"
                onClick={openGreet}
              >
                <Gift className="h-3.5 w-3.5" /> Send Greeting
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(l.greetings || []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <Gift className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No greetings sent yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  l.greetings.map((g: any) => {
                    const statusInfo =
                      GREETING_STATUS_STYLES[g.status] ||
                      GREETING_STATUS_STYLES.PENDING;
                    const channelInfo =
                      CHANNEL_ICONS[g.channel] || CHANNEL_ICONS.IN_APP;
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(g.createdAt), "dd MMM yyyy")}
                          <p className="text-[10px] text-muted-foreground">
                            {format(new Date(g.createdAt), "hh:mm a")}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {g.type === "BIRTHDAY" && "🎂 "}
                            {g.type}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Year {g.year}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {channelInfo.icon} {channelInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <p className="text-sm truncate">{g.message}</p>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-1.5 ${statusInfo.color}`}
                          >
                            <statusInfo.Icon className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">
                              {statusInfo.label}
                            </span>
                          </div>
                          {g.sentAt && (
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(g.sentAt), "dd MMM, hh:mm a")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {g.sentBy || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Metadata */}
        <div className="text-xs text-muted-foreground text-center pb-4">
          Added {format(new Date(l.createdAt), "dd MMM yyyy")} • Last updated{" "}
          {format(new Date(l.updatedAt), "dd MMM yyyy, hh:mm a")}
        </div>
      </div>

      {/* ─── Send Greeting Dialog ──────────────────────── */}
      <Dialog open={greetDlg} onOpenChange={setGreetDlg}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-pink-500" />
              Send Greeting — {l.name}
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
                      .replace(/\{name\}/g, l.name)
                      .replace(
                        /\{age\}/g,
                        String(l.age + (l.isBirthdayToday ? 0 : 1)),
                      ),
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
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
              <Label>Channel</Label>
              <Select
                value={gf.channel}
                onValueChange={(v) => setGf((p) => ({ ...p, channel: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">💬 WhatsApp</SelectItem>
                  <SelectItem value="SMS">📱 SMS</SelectItem>
                  <SelectItem value="EMAIL">📧 Email</SelectItem>
                  <SelectItem value="IN_APP">🔔 In-App</SelectItem>
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
                rows={5}
              />
              {/* <p className="text-[10px] text-muted-foreground">
                Placeholders: {"{name}"}, {"{age}"}, {"{designation}"}
              </p> */}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGreetDlg(false)}>
              Cancel
            </Button>
            <Button
              disabled={greetMut.isPending || !gf.message}
              onClick={sendSingle}
              className="gap-1.5 bg-pink-600 hover:bg-pink-700"
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
    </MainLayout>
  );
}
