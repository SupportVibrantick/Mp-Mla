import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, Calendar, Award, Building, Loader2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function RepresentativeProfilePage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [constituencyId, setConstituencyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>({
    name: "",
    title: "",
    partyName: "",
    partyLogoUrl: "",
    photoUrl: "",
    termStartDate: "",
    termEndDate: "",
  });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchConstituencyAndProfile();
  }, []);

  const fetchConstituencyAndProfile = async () => {
    setLoading(true);
    try {
      // 1. Get the list of constituencies to find the active one
      const constRes = await api.get("/admin/constituency/constituencies/list");
      const raw = constRes.data?.data;
      const list = Array.isArray(raw) ? raw : raw?.items || [];
      if (list.length > 0) {
        const activeConst = list[0];
        setConstituencyId(activeConst.id);

        // 2. Fetch the representative profile for this constituency
        try {
          const profileRes = await api.get(`/admin/constituency/constituencies/${activeConst.id}/representative`);
          const prof = profileRes.data?.data;
          if (prof) {
            setProfile({
              name: prof.name || "",
              title: prof.title || "",
              partyName: prof.partyName || "",
              partyLogoUrl: prof.partyLogoUrl || "",
              photoUrl: prof.photoUrl || "",
              termStartDate: prof.termStartDate ? new Date(prof.termStartDate).toISOString().split("T")[0] : "",
              termEndDate: prof.termEndDate ? new Date(prof.termEndDate).toISOString().split("T")[0] : "",
            });
          } else {
            setProfile({
              name: "",
              title: "",
              partyName: "",
              partyLogoUrl: "",
              photoUrl: "",
              termStartDate: "",
              termEndDate: "",
            });
          }
        } catch (err: any) {
          // If 404, reset profile to blank
          setProfile({
            name: "",
            title: "",
            partyName: "",
            partyLogoUrl: "",
            photoUrl: "",
            termStartDate: "",
            termEndDate: "",
          });
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load representative profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!constituencyId) return;
    setSaving(true);
    try {
      const payload = {
        ...profile,
        termStartDate: profile.termStartDate ? new Date(profile.termStartDate) : null,
        termEndDate: profile.termEndDate ? new Date(profile.termEndDate) : null,
      };
      await api.put(`/admin/constituency/constituencies/${constituencyId}/representative`, payload);
      toast.success("Profile saved successfully.");
      setEditing(false);
      fetchConstituencyAndProfile();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to save profile details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!constituencyId) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/constituency/constituencies/${constituencyId}/representative`);
      toast.success("Representative profile deleted successfully.");
      setEditing(false);
      fetchConstituencyAndProfile();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Failed to delete representative profile.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <MainLayout title="Representative Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Card Header */}
        <Card className="border border-border/50 bg-card rounded-3xl overflow-hidden shadow-xl">
          <div className="h-40 bg-gradient-to-r from-blue-700 via-indigo-800 to-purple-900 relative" />
          <CardContent className="p-8 relative">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-20 sm:-mt-16 mb-6">
              <Avatar className="h-32 w-32 border-4 border-card shadow-2xl">
                <AvatarImage src={profile.photoUrl} />
                <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                  <User className="h-16 w-16" />
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left space-y-1 flex-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {profile.name || "Representative Name"}
                </h1>
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1.5">
                  <Award className="h-4 w-4 text-primary" /> {profile.title || "Title / Role"}
                </p>
              </div>
              <div>
                {!editing ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setEditing(true)}
                      className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs h-9 px-6 rounded-xl shadow-md"
                    >
                      Edit Profile
                    </Button>
                    {profile.name && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="border-destructive/30 hover:bg-destructive/10 text-destructive font-semibold text-xs h-9 px-4 rounded-xl"
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            Delete Profile
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-extrabold text-foreground">
                              Delete Representative Profile?
                            </AlertDialogTitle>
                          </AlertDialogHeader>
                          <p className="text-xs text-muted-foreground">
                            Are you sure you want to delete the representative profile for <strong>{profile.name}</strong>? This profile will be moved to the Recycle Bin.
                          </p>
                          <AlertDialogFooter className="gap-2 sm:gap-0">
                            <AlertDialogCancel className="border-border/60 hover:bg-muted">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              disabled={deleting}
                              className="bg-destructive hover:bg-destructive/90 text-white font-semibold"
                              onClick={handleDelete}
                            >
                              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                              Delete Profile
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEditing(false)}
                      className="border-border/60 hover:bg-muted text-xs h-9 px-4 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-xl"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Save Profile
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="space-y-4 py-8">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : !editing ? (
              <div className="mt-8 grid sm:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-muted/10">
                    <Building className="h-5 w-5 text-indigo-500" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Party Association</p>
                      <p className="font-semibold text-foreground mt-0.5">{profile.partyName || "N/A"}</p>
                    </div>
                  </div>
                  {profile.partyLogoUrl && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-muted/10">
                      <img src={profile.partyLogoUrl} alt="Party Logo" className="h-10 w-auto object-contain" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Party Logo</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-muted/10">
                    <Calendar className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Term Duration</p>
                      <p className="font-semibold text-foreground mt-0.5">
                        {profile.termStartDate ? new Date(profile.termStartDate).toLocaleDateString() : "N/A"}
                        {" - "}
                        {profile.termEndDate ? new Date(profile.termEndDate).toLocaleDateString() : "Active"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 space-y-4 max-w-xl text-sm">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Representative Name *</Label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile((p: any) => ({ ...p, name: e.target.value }))}
                      placeholder="E.g., Shri Example Singh"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Representative Title *</Label>
                    <Input
                      value={profile.title}
                      onChange={(e) => setProfile((p: any) => ({ ...p, title: e.target.value }))}
                      placeholder="E.g., Member of Parliament"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Representative Photo URL</Label>
                    <Input
                      value={profile.photoUrl}
                      onChange={(e) => setProfile((p: any) => ({ ...p, photoUrl: e.target.value }))}
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Political Party Name</Label>
                    <Input
                      value={profile.partyName}
                      onChange={(e) => setProfile((p: any) => ({ ...p, partyName: e.target.value }))}
                      placeholder="E.g., XYZ Party"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Party Logo URL</Label>
                  <Input
                    value={profile.partyLogoUrl}
                    onChange={(e) => setProfile((p: any) => ({ ...p, partyLogoUrl: e.target.value }))}
                    placeholder="https://example.com/party-logo.png"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Term Start Date</Label>
                    <Input
                      type="date"
                      value={profile.termStartDate}
                      onChange={(e) => setProfile((p: any) => ({ ...p, termStartDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Term End Date</Label>
                    <Input
                      type="date"
                      value={profile.termEndDate}
                      onChange={(e) => setProfile((p: any) => ({ ...p, termEndDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
