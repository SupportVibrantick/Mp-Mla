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
  Bell,
  Smartphone,
  Check,
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
  READ: { color: "text-indigo-600", Icon: Check, label: "Read" },
};

import type { LucideIcon } from "lucide-react";

const CHANNEL_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  WHATSAPP: { icon: MessageCircle, label: "WhatsApp" },
  EMAIL: { icon: Mail, label: "Email" },
  SMS: { icon: Smartphone, label: "SMS" },
  IN_APP: { icon: Bell, label: "In-App" },
};
// const INFLUENCE_DISPLAY: Record<
//   string,
//   { dots: string; color: string; bg: string }
// > = {
//   High: {
//     dots: "●●●",
//     color: "text-red-600",
//     bg: "bg-red-100 dark:bg-red-900/30",
//   },
//   Medium: {
//     dots: "●●○",
//     color: "text-amber-600",
//     bg: "bg-amber-100 dark:bg-amber-900/30",
//   },
//   Low: {
//     dots: "●○○",
//     color: "text-green-600",
//     bg: "bg-green-100 dark:bg-green-900/30",
//   },
// };


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
  const [gf, setGf] = useState({ channel: "EMAIL", message: "" });

  const l = res?.data;

  if (isLoading) {
    return (
      <MainLayout title="Local Representative">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );
  }

  if (!l) {
    return (
      <MainLayout title="Local Representative">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Users className="h-12 w-12 text-muted-foreground" />
          <p>Local representative not found</p>
          <Link to="/leaders">
            <Button variant="outline">Back to Local Representatives</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const cInfo = getCategoryInfo(l.category);
  const dob = new Date(l.dateOfBirth);
  // const infDisplay = INFLUENCE_DISPLAY[l.influence] || null;


  const openGreet = () => {
    const msg = GREETING_TEMPLATES[0].message
      .replace(/\{name\}/g, l.name)
      .replace(/\{age\}/g, String(l.age + (l.isBirthdayToday ? 0 : 1)));
    setGf({ channel: "EMAIL", message: msg });
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
    <MainLayout title="Representative Profile">
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header/Cover Card */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <div className="h-32 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950/90 relative" />
          <div className="px-6 pb-6 relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="relative">
                {l.photoUrl ? (
                  <img
                    src={l.photoUrl}
                    alt={l.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-card shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-4 border-card shadow-md">
                    {l.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                )}
                {l.isBirthdayToday && (
                  <span className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm border border-pink-200 dark:border-pink-700 animate-bounce">
                    <Cake className="h-4 w-4 text-pink-500" />
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center justify-center sm:justify-start gap-2">
                  {l.name}
                </h1>
                <p className="text-xs text-muted-foreground font-semibold">
                  {[l.designation, l.organization, l.partyName]
                    .filter(Boolean)
                    .join(" • ") || "No designation specified"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-center sm:justify-end">
              <Link to="/leaders">
                <Button variant="outline" size="sm" className="gap-1 border-border/60 text-xs font-bold">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Button>
              </Link>
              <PermissionGate module="leaders" action="update">
                <Link to={`/leaders/${l.id}/edit`}>
                  <Button variant="outline" size="sm" className="gap-1 border-border/60 text-xs font-bold">
                    <Edit className="h-3.5 w-3.5 text-blue-600" /> Edit
                  </Button>
                </Link>
              </PermissionGate>
              <PermissionGate module="leaders" action="delete">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs font-bold"
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
        </Card>

        {/* ─── Birthday Card ───────────────────────────── */}
        <Card
          className={`border bg-card rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ${
            l.isBirthdayToday
              ? "border-pink-300 dark:border-pink-700/80 bg-gradient-to-r from-pink-500/5 via-yellow-500/5 to-pink-500/5 hover:border-pink-400"
              : l.daysUntilBirthday <= 7
                ? "border-amber-200 dark:border-amber-800"
                : "border-border/50"
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border ${
                    l.isBirthdayToday
                      ? "bg-pink-100 border-pink-200 dark:bg-pink-900/40 dark:border-pink-800"
                      : "bg-muted border-border"
                  }`}
                >
                  {l.isBirthdayToday ? (
                    <PartyPopper className="h-6 w-6 text-pink-500" />
                  ) : (
                    <Cake className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                    Date of Birth
                  </p>
                  <p className="text-lg font-extrabold text-foreground mt-0.5">
                    {format(dob, "dd MMMM yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground font-semibold">
                    {l.age} years old
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {l.isBirthdayToday ? (
                  <>
                    <Badge className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-3 py-1 gap-1.5 border-none font-bold">
                      <PartyPopper className="h-3.5 w-3.5" /> Birthday TODAY!
                    </Badge>
                    {l.birthdayGreetedThisYear ? (
                      <Badge className="bg-green-500/10 text-green-600 text-[10px] font-bold gap-1 border-none">
                        <Check className="h-3 w-3" /> Greeted this year
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
                              className="gap-1.5 text-xs text-green-600 border-green-200 bg-green-500/5 hover:bg-green-500/10 font-bold"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                          </a>
                        )}
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs bg-pink-600 hover:bg-pink-700 font-bold border-none"
                          onClick={openGreet}
                        >
                          <Gift className="h-3.5 w-3.5" /> Send Greeting
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-right">
                    <p className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground">
                      Next birthday
                    </p>
                    <p className="text-base font-extrabold text-foreground mt-0.5">
                      {l.daysUntilBirthday === 1
                        ? "Tomorrow!"
                        : `In ${l.daysUntilBirthday} days`}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold">
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
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-3 px-5 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 px-5">
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
                    <div className="p-1.5 bg-muted rounded-lg flex-shrink-0 border">
                      <c.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        {c.label}
                      </p>
                      {c.href ? (
                        <a
                          href={c.href}
                          {...(c.external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="text-xs font-bold text-primary hover:underline mt-0.5 block"
                        >
                          {c.value}
                        </a>
                      ) : (
                        <p className="text-xs font-bold text-foreground mt-0.5">{c.value}</p>
                      )}
                    </div>
                  </div>
                ))}

              {l.ward && (
                <div className="flex items-start gap-3 text-sm">
                  <div className="p-1.5 bg-muted rounded-lg flex-shrink-0 border">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold">Ward</p>
                    <Link to={`/wards/${l.ward.id}`}>
                      <p className="text-xs font-bold text-primary hover:underline cursor-pointer mt-0.5">
                        #{l.ward.wardNumber} {l.ward.name}
                      </p>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-3 px-5 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 px-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Category</p>
                  <div className="mt-1">
                    {(() => {
                      const CatIcon = cInfo.icon;
                      return (
                        <Badge variant="secondary" className="text-[10px] font-bold gap-1">
                          <CatIcon className="h-3.5 w-3.5" /> {cInfo.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Gender</p>
                  <p className="text-xs font-bold mt-1.5 text-foreground">{l.gender || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Relation</p>
                  <div className="mt-1">
                    {l.relation ? (
                      <Badge
                        className={`text-[10px] font-bold border-none ${RELATION_STYLES[l.relation] || ""}`}
                      >
                        {l.relation}
                      </Badge>
                    ) : (
                      <p className="text-xs font-bold text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold">Status</p>
                  <div className="mt-1">
                    {l.isActive ? (
                      <Badge className="text-[10px] font-bold bg-green-500/10 text-green-500 border-none">
                        Active Account
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] font-bold border-none">
                        Inactive Account
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Links */}
              {(l.facebookUrl || l.twitterUrl || l.instagramUrl) && (
                <div className="pt-4 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2">
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
                          className="h-8 w-8 rounded-lg border-border/60 bg-card hover:bg-muted"
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
                          className="h-8 w-8 rounded-lg border-border/60 bg-card hover:bg-muted"
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
                          className="h-8 w-8 rounded-lg border-border/60 bg-card hover:bg-muted"
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
                <div className="pt-4 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {l.tags.map((t: string) => (
                      <Badge key={t} variant="outline" className="text-[10px] font-bold">
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
          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-3 px-5 border-b border-border/30">
              <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed font-medium">{l.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* ─── Greeting History ─────────────────────────── */}
        <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 sm:px-6 border-b border-border/30">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Gift className="h-4 w-4 text-pink-500" /> Greeting History
            </CardTitle>
            <PermissionGate module="leaders" action="update">
              <Button
                size="sm"
                className="gap-1.5 text-xs bg-pink-600 hover:bg-pink-700 font-bold border-none"
                onClick={openGreet}
              >
                <Gift className="h-3.5 w-3.5" /> Send Greeting
              </Button>
            </PermissionGate>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/50">
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Date</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Type</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Channel</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Message</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Status</TableHead>
                  <TableHead className="h-12 px-4 text-left text-[10px] tracking-wider uppercase font-semibold text-muted-foreground py-4 bg-muted/20">Sent By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(l.greetings || []).length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={6}
                      className="text-center py-16 text-muted-foreground text-xs font-semibold"
                    >
                      <Gift className="h-8 w-8 mx-auto mb-2 opacity-30 text-pink-500" />
                      <p className="text-sm font-bold text-foreground">No greetings sent yet</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  l.greetings.map((g: any) => {
                    const statusInfo =
                      GREETING_STATUS_STYLES[g.status] ||
                      GREETING_STATUS_STYLES.PENDING;
                    const channelInfo =
                      CHANNEL_ICONS[g.channel] || CHANNEL_ICONS.IN_APP || CHANNEL_ICONS.EMAIL;
                    return (
                      <TableRow key={g.id} className="hover:bg-muted/10 transition-colors border-b border-border/40">
                        <TableCell className="text-xs py-4 px-4 font-semibold text-muted-foreground whitespace-nowrap">
                          {format(new Date(g.createdAt), "dd MMM yyyy")}
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                            {format(new Date(g.createdAt), "hh:mm a")}
                          </p>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold gap-0.5"
                          >
                            {g.type === "BIRTHDAY" && (
                              <Cake className="h-2.5 w-2.5 text-pink-500" />
                            )}
                            {g.type}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            Year {g.year}
                          </p>
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          {(() => {
                            const ChIcon = channelInfo.icon;
                            return (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-bold gap-0.5"
                              >
                                <ChIcon className="h-2.5 w-2.5" />{" "}
                                {channelInfo.label}
                              </Badge>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-xs py-4 px-4 font-semibold text-muted-foreground max-w-[250px] truncate">
                          {g.message}
                        </TableCell>
                        <TableCell className="py-4 px-4 align-middle">
                          <div
                            className={`flex items-center gap-1.5 ${statusInfo.color}`}
                          >
                            <statusInfo.Icon className="h-3.5 w-3.5" />
                            <span className="text-xs font-bold">
                              {statusInfo.label}
                            </span>
                          </div>
                          {g.sentAt && (
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              {format(new Date(g.sentAt), "dd MMM, hh:mm a")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-4 px-4 font-semibold text-muted-foreground">
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
        <div className="text-[10px] font-bold text-muted-foreground text-center pb-4">
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
                  <SelectItem value="EMAIL">
                    <span className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </span>
                  </SelectItem>
                  <SelectItem value="WHATSAPP">
                    <span className="flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </span>
                  </SelectItem>
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
