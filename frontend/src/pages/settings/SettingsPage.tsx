import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  useSettings,
  useUpdateSettings,
  useResetSettings,
  useTestEmail,
  SETTING_GROUPS,
} from "@/hooks/useSettings";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn, getImageUrl } from "@/lib/utils";
import {
  Settings,
  Save,
  RotateCcw,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Bell,
  Palette,
  Database,
  ClipboardList,
  User,
  Globe,
  Camera,
  CheckCircle2,
  MapPin,
  Navigation,
  Mail,
  Calendar,
  Upload,
} from "lucide-react";

// ─── Google Translate Integration ────────────────────────────────────────────

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "bn", label: "বাংলা (Bengali)" },
  { code: "ta", label: "தமிழ் (Tamil)" },
  { code: "te", label: "తెలుగు (Telugu)" },
  { code: "mr", label: "मराठी (Marathi)" },
  { code: "gu", label: "ગુજરાતી (Gujarati)" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
  { code: "ml", label: "മലയാളം (Malayalam)" },
  { code: "pa", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "es", label: "Español (Spanish)" },
  { code: "fr", label: "Français (French)" },
  { code: "de", label: "Deutsch (German)" },
  { code: "pt", label: "Português (Portuguese)" },
  { code: "ru", label: "Русский (Russian)" },
  { code: "ja", label: "日本語 (Japanese)" },
  { code: "ko", label: "한국어 (Korean)" },
  { code: "zh-CN", label: "中文 (Chinese)" },
  { code: "ar", label: "العربية (Arabic)" },
];

// ─── Constants ───────────────────────────────────────────────────────────────

const GROUP_ICONS: Record<string, any> = {
  profile: User,
  general: Settings,
  language: Globe,
  location: MapPin,
  branding: Palette,
  security: Shield,
  grievance: ClipboardList,
  notifications: Bell,
  email_smtp: Mail,
  backup: Database,
  meetings: Calendar,
};

// Add profile, language & location to the group list for sidebar rendering
const EXTENDED_GROUPS = [
  { id: "profile", label: "Profile", desc: "Your personal account details" },
  {
    id: "language",
    label: "Language",
    desc: "Change the display language",
  },
  {
    id: "location",
    label: "Location",
    desc: "Manage your location preferences",
  },
  ...SETTING_GROUPS,
];

// ─── Profile Section Component ───────────────────────────────────────────────

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  bio: string;
  avatarUrl: string;
}

function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>({
    fullName: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    designation: user?.designation || "",
    department: user?.department || "",
    bio: user?.bio || "",
    avatarUrl: user?.avatarUrl || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        designation: user.designation || "",
        department: user.department || "",
        bio: user.bio || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  const update = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!profile.fullName || profile.fullName.trim().length < 2) {
      newErrors.fullName = "Full Name must be at least 2 characters.";
    }
    if (profile.phone && profile.phone.trim().length > 0 && profile.phone.trim().length < 7) {
      newErrors.phone = "Please enter a valid phone number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      update("avatarUrl", reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!validate()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the form before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await authApi.updateMe({
        name: profile.fullName.trim(),
        phone: profile.phone.trim(),
        designation: profile.designation.trim(),
        department: profile.department.trim(),
        bio: profile.bio.trim(),
        avatarUrl: profile.avatarUrl,
      });
      await refreshUser();
      setSaved(true);
      toast({
        title: "Profile Saved",
        description: "Your profile information has been updated successfully.",
      });
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      let errorMsg = "Failed to update profile. Please try again.";
      if (error?.response?.data?.message) {
        const msg = error.response.data.message;
        if (typeof msg === "string") {
          try {
            const parsed = JSON.parse(msg);
            if (Array.isArray(parsed) && parsed[0]?.message) {
              errorMsg = parsed[0].message;
            } else {
              errorMsg = msg;
            }
          } catch {
            errorMsg = msg;
          }
        }
      } else if (error?.message) {
        errorMsg = error.message;
      }
      toast({
        title: "Save Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative group">
          <Avatar className="h-20 w-20 border-2 border-muted">
            <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />
            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>
          <label
            htmlFor="avatar-upload"
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-5 w-5 text-white" />
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="font-semibold text-lg">
            {profile.fullName || "Your Name"}
          </p>
          <p className="text-sm text-muted-foreground">
            {profile.designation || "Designation"} •{" "}
            {profile.department || "Department"}
          </p>
        </div>
      </div>

      <Separator />

      {/* Fields */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm">Full Name</Label>
          <Input
            value={profile.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            placeholder="John Doe"
            className={cn(errors.fullName && "border-destructive focus-visible:ring-destructive")}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Email Address</Label>
          <Input
            type="email"
            value={profile.email}
            readOnly
            disabled
            className="bg-muted/50 text-muted-foreground cursor-not-allowed font-medium"
            placeholder="john@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Phone Number</Label>
          <Input
            type="tel"
            value={profile.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="+91 98765 43210"
            className={cn(errors.phone && "border-destructive focus-visible:ring-destructive")}
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Designation</Label>
          <Input
            value={profile.designation}
            onChange={(e) => update("designation", e.target.value)}
            placeholder="Senior Manager"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Department</Label>
          <Input
            value={profile.department}
            onChange={(e) => update("department", e.target.value)}
            placeholder="Human Resources"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-sm">Bio</Label>
          <Textarea
            value={profile.bio}
            onChange={(e) => update("bio", e.target.value)}
            rows={3}
            placeholder="A short bio about yourself..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2 min-w-[130px]">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : saved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Profile</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Language Section Component ──────────────────────────────────────────────

function LanguageSection() {
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="space-y-2 max-w-md">
        <Label className="text-sm font-medium">Display Language</Label>
        <Select value={language} onValueChange={changeLanguage}>
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          The entire page will be translated using Google Translate. Some
          formatting may change slightly.
        </p>
      </div>

      <Separator />

      <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          How it works
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          When you select a language other than English, the page content is
          translated in real-time via Google Translate. Your preference is saved
          locally so it persists across sessions. To revert, simply select
          "English".
        </p>
      </div>
    </div>
  );
}

// ─── Location Section Component ───────────────────────────────────────────────

interface LocationData {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates: string;
  autoDetect: boolean;
}

function LocationSection() {
  const [location, setLocation] = useState<LocationData>({
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    coordinates: "",
    autoDetect: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user_location");
    if (stored) {
      try {
        setLocation(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  const update = (field: keyof LocationData, value: string | boolean) => {
    setLocation((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setDetectError("Geolocation is not supported by your browser");
      return;
    }

    setDetecting(true);
    setDetectError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        update("coordinates", coords);

        // Reverse geocoding using Nominatim (free, no API key required)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          );
          const data = await response.json();

          if (data.address) {
            update(
              "city",
              data.address.city ||
                data.address.town ||
                data.address.village ||
                "",
            );
            update("state", data.address.state || "");
            update("country", data.address.country || "");
            update("postalCode", data.address.postcode || "");
            update("address", data.display_name || "");
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          setDetectError(
            "Location detected but couldn't fetch address details",
          );
        }

        setDetecting(false);
        setSaved(false);
      },
      (error) => {
        setDetecting(false);
        setDetectError(
          error.code === 1
            ? "Location access denied. Please enable location permissions."
            : "Unable to detect location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    localStorage.setItem("user_location", JSON.stringify(location));
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      {/* Auto-detect button */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={detectLocation}
          disabled={detecting}
          className="gap-2"
        >
          {detecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          {detecting ? "Detecting..." : "Auto-detect Location"}
        </Button>
        <Switch
          checked={location.autoDetect}
          onCheckedChange={(v) => update("autoDetect", v)}
        />
        <Label className="text-sm">Auto-detect on page load</Label>
      </div>

      {detectError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">{detectError}</p>
        </div>
      )}

      <Separator />

      {/* Coordinates display */}
      {location.coordinates && (
        <div className="rounded-lg border p-3 bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Coordinates</p>
          <p className="text-sm font-mono">{location.coordinates}</p>
        </div>
      )}

      {/* Address fields */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-sm">Street Address</Label>
          <Input
            value={location.address}
            onChange={(e) => update("address", e.target.value)}
            placeholder="123 Main Street, Building A"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">City</Label>
          <Input
            value={location.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Mumbai"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">State / Province</Label>
          <Input
            value={location.state}
            onChange={(e) => update("state", e.target.value)}
            placeholder="Maharashtra"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Postal Code</Label>
          <Input
            value={location.postalCode}
            onChange={(e) => update("postalCode", e.target.value)}
            placeholder="400001"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Country</Label>
          <Input
            value={location.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="India"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved" : "Save Location"}
        </Button>
      </div>

      {/* Map preview placeholder */}
      {location.coordinates && (
        <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
          <p className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Location Preview
          </p>
          <div className="h-32 bg-muted rounded flex items-center justify-center">
            <p className="text-xs text-muted-foreground">
              Map would display here with marker at {location.coordinates}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Settings Page ──────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: res, isLoading } = useSettings();
  const updateMut = useUpdateSettings();
  const resetMut = useResetSettings();
  const testEmailMut = useTestEmail();

  const [activeGroup, setActiveGroup] = useState("profile");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testEmailTo, setTestEmailTo] = useState("");
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  const allSettings = res?.data || {};

  useEffect(() => {
    if (!res?.data) return;
    const vals: Record<string, string> = {};
    for (const group of Object.values(res.data) as any[][]) {
      for (const s of group) {
        vals[s.key] = s.value || "";
      }
    }
    setFormValues(vals);
    setDirty(false);
  }, [res]);

  const groupSettings = useMemo(
    () => allSettings[activeGroup] || [],
    [allSettings, activeGroup],
  );

  const updateValue = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    const hasFiles = Object.keys(imageFiles).length > 0;
    
    const changes = groupSettings
      .filter((s: any) => {
        const current = formValues[s.key] ?? "";
        return (
          imageFiles[s.key] ||
          (current !== (s.value || "") && !(s.masked && current.includes("••••")))
        );
      })
      .map((s: any) => ({ key: s.key, value: formValues[s.key] ?? "" }));

    if (changes.length === 0 && !hasFiles) {
      setDirty(false);
      return;
    }

    if (hasFiles) {
      const formData = new FormData();
      formData.append("settings", JSON.stringify(changes));
      Object.entries(imageFiles).forEach(([key, file]) => {
        formData.append(`settingImage__${key}`, file);
      });
      await updateMut.mutateAsync(formData);
    } else {
      await updateMut.mutateAsync(changes);
    }
    
    setImageFiles({});
    setImagePreviews({});
    setDirty(false);
  };

  const isCustomGroup =
    activeGroup === "profile" ||
    activeGroup === "language" ||
    activeGroup === "location";

  const renderField = (s: any) => {
    const value = formValues[s.key] ?? "";
    const key = s.key;

    switch (s.type) {
      case "image": {
        const currentImageUrl = imagePreviews[key] || getImageUrl(value);
        return (
          <div className="space-y-4 border p-5 rounded-xl relative overflow-hidden bg-card" key={key}>
            <div className="absolute inset-0 bg-muted/5 pointer-events-none" />
            <div className="relative">
              <Label className="text-base font-semibold">{s.label}</Label>
              <div className="mt-4 flex items-start gap-6">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-primary/20 bg-muted/30 overflow-hidden flex flex-col justify-center items-center relative transition-all group-hover:border-primary/50 group-hover:bg-primary/5">
                    {currentImageUrl ? (
                      <img src={currentImageUrl} alt={s.label} className="w-full h-full object-contain p-2" />
                    ) : (
                      <Upload className="h-6 w-6 text-muted-foreground/50 mb-1" />
                    )}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-medium px-2 text-center flex flex-col items-center">
                        <Upload className="h-4 w-4 mb-1" />
                        Change
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFiles((p) => ({ ...p, [key]: file }));
                        const url = URL.createObjectURL(file);
                        setImagePreviews((p) => ({ ...p, [key]: url }));
                        setDirty(true);
                      }
                    }}
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <p className="text-sm font-medium text-foreground/90">Upload a new {s.label.toLowerCase()}</p>
                  <p className="text-xs text-muted-foreground">{s.description || "Recommended format: PNG, SVG, or JPG."}</p>
                  {imageFiles[key] && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setImageFiles((p) => { const n = {...p}; delete n[key]; return n; });
                        setImagePreviews((p) => { const n = {...p}; delete n[key]; return n; });
                      }} 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 mt-2 -ml-2"
                    >
                      Remove Selected File
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "boolean":
        return (
          <div
            className="flex items-center justify-between p-4 rounded-lg border"
            key={key}
          >
            <div className="flex-1">
              <Label className="text-sm font-medium">{s.label}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.description}
              </p>
            </div>
            <Switch
              checked={value === "true"}
              onCheckedChange={(v) => updateValue(key, v ? "true" : "false")}
            />
          </div>
        );

      case "select":
        return (
          <div className="space-y-2" key={key}>
            <Label className="text-sm">{s.label}</Label>
            <Select value={value} onValueChange={(v) => updateValue(key, v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(s.options || []).map((o: string) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">{s.description}</p>
          </div>
        );

      case "color":
        return (
          <div className="space-y-2" key={key}>
            <Label className="text-sm">{s.label}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={value || "#000000"}
                onChange={(e) => updateValue(key, e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={value}
                onChange={(e) => updateValue(key, e.target.value)}
                className="flex-1 font-mono"
                placeholder="#000000"
              />
              <div
                className="w-20 h-10 rounded border"
                style={{ backgroundColor: value }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">{s.description}</p>
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2" key={key}>
            <Label className="text-sm">{s.label}</Label>
            <Textarea
              value={value}
              onChange={(e) => updateValue(key, e.target.value)}
              rows={3}
            />
            <p className="text-[10px] text-muted-foreground">{s.description}</p>
          </div>
        );

      case "number":
        return (
          <div className="space-y-2" key={key}>
            <Label className="text-sm">{s.label}</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => updateValue(key, e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">{s.description}</p>
          </div>
        );

      case "secret":
        return (
          <div className="space-y-2" key={key}>
            <Label className="text-sm">{s.label}</Label>
            <div className="flex gap-2">
              <Input
                type={showSecrets[key] ? "text" : "password"}
                value={value}
                onChange={(e) => updateValue(key, e.target.value)}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  setShowSecrets((p) => ({ ...p, [key]: !p[key] }))
                }
              >
                {showSecrets[key] ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">{s.description}</p>
          </div>
        );

      default:
        return (
          <div className="space-y-2" key={key}>
            <Label className="text-sm">{s.label}</Label>
            <Input
              value={value}
              onChange={(e) => updateValue(key, e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">{s.description}</p>
          </div>
        );
    }
  };

  if (isLoading)
    return (
      <MainLayout title="Settings">
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="flex gap-6">
            <Skeleton className="h-[500px] w-56" />
            <Skeleton className="h-[500px] flex-1" />
          </div>
        </div>
      </MainLayout>
    );

  const activeMeta = EXTENDED_GROUPS.find((g) => g.id === activeGroup);
  const GroupIcon = GROUP_ICONS[activeGroup] || Settings;

  return (
    <MainLayout title="Settings">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" />
              System Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your profile, preferences, security & more
            </p>
          </div>
          <div className="flex gap-2">
            {dirty && !isCustomGroup && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-300 animate-pulse"
              >
                Unsaved Changes
              </Badge>
            )}
            {!isCustomGroup && (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset Group
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Reset "{activeGroup}" to defaults?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        All settings in this group will be reverted.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => resetMut.mutate(activeGroup)}
                      >
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  disabled={!dirty || updateMut.isPending}
                  onClick={handleSave}
                  className="gap-2"
                >
                  {updateMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-56 flex-shrink-0">
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {EXTENDED_GROUPS.map((g) => {
                const Icon = GROUP_ICONS[g.id] || Settings;
                const isActive = activeGroup === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveGroup(g.id);
                      setDirty(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all whitespace-nowrap lg:whitespace-normal min-w-max lg:min-w-0 w-full",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{g.label}</p>
                      <p
                        className={cn(
                          "text-[10px] hidden lg:block",
                          isActive
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {g.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <Card className="flex-1">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GroupIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {activeMeta?.label} Settings
                  </CardTitle>
                  <CardDescription>{activeMeta?.desc}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Profile tab */}
              {activeGroup === "profile" && <ProfileSection />}

              {/* Language tab */}
              {activeGroup === "language" && <LanguageSection />}

              {/* Location tab */}
              {activeGroup === "location" && <LocationSection />}

              {/* Dynamic server-driven groups */}
              {!isCustomGroup &&
                (() => {
                  if (activeGroup === "notifications") {
                    const smsEnabledSetting = groupSettings.find((s: any) => s.key === "sms_enabled");
                    const smsProviderSetting = groupSettings.find((s: any) => s.key === "sms_provider");
                    const smsApiKeySetting = groupSettings.find((s: any) => s.key === "sms_api_key");
                    const smsSenderIdSetting = groupSettings.find((s: any) => s.key === "sms_sender_id");

                    const whatsappEnabledSetting = groupSettings.find((s: any) => s.key === "whatsapp_enabled");
                    const whatsappApiKeySetting = groupSettings.find((s: any) => s.key === "whatsapp_api_key");

                    const otherToggles = groupSettings.filter(
                      (s: any) =>
                        s.type === "boolean" &&
                        s.key !== "sms_enabled" &&
                        s.key !== "whatsapp_enabled"
                    );

                    return (
                      <div className="space-y-6">
                        {/* SMS Card */}
                        {smsEnabledSetting && (
                          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                            <div className="p-6 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 pr-4">
                                  <Label className="text-base font-semibold">{smsEnabledSetting.label}</Label>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {smsEnabledSetting.description}
                                  </p>
                                </div>
                                <Switch
                                  checked={(formValues["sms_enabled"] ?? smsEnabledSetting.value) === "true"}
                                  onCheckedChange={(v) => updateValue("sms_enabled", v ? "true" : "false")}
                                />
                              </div>

                              {(formValues["sms_enabled"] ?? smsEnabledSetting.value) === "true" && (
                                <div className="pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    {smsProviderSetting && (
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">{smsProviderSetting.label}</Label>
                                        <Select
                                          value={formValues["sms_provider"] ?? smsProviderSetting.value ?? ""}
                                          onValueChange={(v) => updateValue("sms_provider", v)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select SMS Provider" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {(smsProviderSetting.options || []).map((o: string) => (
                                              <SelectItem key={o} value={o}>
                                                {o}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-muted-foreground">{smsProviderSetting.description}</p>
                                      </div>
                                    )}

                                    {smsSenderIdSetting && (
                                      <div className="space-y-2">
                                        <Label className="text-sm font-medium">{smsSenderIdSetting.label}</Label>
                                        <Input
                                          value={formValues["sms_sender_id"] ?? smsSenderIdSetting.value ?? ""}
                                          onChange={(e) => updateValue("sms_sender_id", e.target.value)}
                                          placeholder="e.g. CONSTY"
                                        />
                                        <p className="text-[10px] text-muted-foreground">{smsSenderIdSetting.description}</p>
                                      </div>
                                    )}

                                    {smsApiKeySetting && (
                                      <div className="space-y-2 sm:col-span-2">
                                        <Label className="text-sm font-medium">{smsApiKeySetting.label}</Label>
                                        <div className="flex gap-2">
                                          <Input
                                            type={showSecrets["sms_api_key"] ? "text" : "password"}
                                            value={formValues["sms_api_key"] ?? smsApiKeySetting.value ?? ""}
                                            onChange={(e) => updateValue("sms_api_key", e.target.value)}
                                            className="font-mono"
                                            placeholder="Enter SMS API Key"
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() =>
                                              setShowSecrets((p) => ({ ...p, sms_api_key: !p.sms_api_key }))
                                            }
                                          >
                                            {showSecrets["sms_api_key"] ? (
                                              <EyeOff className="h-4 w-4" />
                                            ) : (
                                              <Eye className="h-4 w-4" />
                                            )}
                                          </Button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">{smsApiKeySetting.description}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* WhatsApp Card */}
                        {whatsappEnabledSetting && (
                          <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
                            <div className="p-6 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 pr-4">
                                  <Label className="text-base font-semibold">{whatsappEnabledSetting.label}</Label>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {whatsappEnabledSetting.description}
                                  </p>
                                </div>
                                <Switch
                                  checked={(formValues["whatsapp_enabled"] ?? whatsappEnabledSetting.value) === "true"}
                                  onCheckedChange={(v) => updateValue("whatsapp_enabled", v ? "true" : "false")}
                                />
                              </div>

                              {(formValues["whatsapp_enabled"] ?? whatsappEnabledSetting.value) === "true" && (
                                <div className="pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                  {whatsappApiKeySetting && (
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">{whatsappApiKeySetting.label}</Label>
                                      <div className="flex gap-2">
                                        <Input
                                          type={showSecrets["whatsapp_api_key"] ? "text" : "password"}
                                          value={formValues["whatsapp_api_key"] ?? whatsappApiKeySetting.value ?? ""}
                                          onChange={(e) => updateValue("whatsapp_api_key", e.target.value)}
                                          className="font-mono"
                                          placeholder="Enter WhatsApp API Key"
                                        />
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          onClick={() =>
                                            setShowSecrets((p) => ({ ...p, whatsapp_api_key: !p.whatsapp_api_key }))
                                          }
                                        >
                                          {showSecrets["whatsapp_api_key"] ? (
                                            <EyeOff className="h-4 w-4" />
                                          ) : (
                                            <Eye className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </div>
                                      <p className="text-[10px] text-muted-foreground">{whatsappApiKeySetting.description}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* General Notification Toggles */}
                        {otherToggles.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Notification Alerts
                            </p>
                            <div className="space-y-2">
                              {otherToggles.map((s: any) => renderField(s))}
                            </div>
                          </div>
                        )}

                        {groupSettings.length === 0 && (
                          <p className="text-sm text-muted-foreground py-8 text-center">
                            No settings available for this group yet.
                          </p>
                        )}
                      </div>
                    );
                  }

                  const booleans = groupSettings.filter(
                    (s: any) => s.type === "boolean",
                  );
                  const others = groupSettings.filter(
                    (s: any) => s.type !== "boolean",
                  );
                  return (
                    <div className="space-y-6">
                      {others.length > 0 && (
                        <div className="grid gap-5 sm:grid-cols-2">
                          {others.map((s: any) => (
                            <div
                              key={s.key}
                              className={
                                s.type === "textarea" || s.type === "color"
                                  ? "sm:col-span-2"
                                  : ""
                              }
                            >
                              {renderField(s)}
                            </div>
                          ))}
                        </div>
                      )}
                      {booleans.length > 0 && others.length > 0 && (
                        <Separator />
                      )}
                      {booleans.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Toggles
                          </p>
                          <div className="space-y-2">
                            {booleans.map((s: any) => renderField(s))}
                          </div>
                        </div>
                      )}
                      {groupSettings.length === 0 && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                          No settings available for this group yet.
                        </p>
                      )}

                      {/* Test Connection UI for Email & SMTP */}
                      {activeGroup === "email_smtp" && (
                        <>
                          <Separator className="my-6" />
                          <div className="rounded-lg border p-5 bg-muted/20">
                            <h3 className="text-sm font-semibold mb-1">Test SMTP Connection</h3>
                            <p className="text-xs text-muted-foreground mb-4">
                              Save your settings first, then enter an email address below to test if the portal can send emails.
                            </p>
                            <div className="flex gap-3 max-w-sm">
                              <Input
                                placeholder="test@example.com"
                                type="email"
                                value={testEmailTo}
                                onChange={(e) => setTestEmailTo(e.target.value)}
                              />
                              <Button 
                                onClick={() => testEmailMut.mutate(testEmailTo)}
                                disabled={!testEmailTo || testEmailMut.isPending}
                                className="shrink-0 gap-2"
                              >
                                {testEmailMut.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                                Send Test
                              </Button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
