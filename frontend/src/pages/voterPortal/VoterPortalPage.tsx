import { useState, useEffect } from "react";
import api from "@/lib/api";
import { getImageUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Phone,
  MapPin,
  User,
  Camera,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  KeyRound,
  ArrowRight,
  UserCheck,
  FileText,
  Smartphone,
  Shield,
  Zap,
  Share2,
  Hash,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { InteractiveMeshBackground } from "@/components/ui/InteractiveMeshBackground";

export default function VoterPortalPage() {
  const { toast } = useToast();
  const { settings } = useSystemSettings();

  // Auth State (Uses sessionStorage for enhanced voter verification security & session isolation)
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem("voterToken") || localStorage.getItem("voterToken")
  );
  const [voter, setVoter] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(!!token);
  const [forcePasswordChange, setForcePasswordChange] = useState<boolean>(false);

  // Application Login Tab State
  const [appNumberInput, setAppNumberInput] = useState("");
  const [appPasswordInput, setAppPasswordInput] = useState("");
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [loggingInApp, setLoggingInApp] = useState(false);

  // Mobile Login Tab State
  const [mobileNumberInput, setMobileNumberInput] = useState("");
  const [mobilePasswordInput, setMobilePasswordInput] = useState("");
  const [showMobilePassword, setShowMobilePassword] = useState(false);
  const [loggingInMobile, setLoggingInMobile] = useState(false);

  // Profile Selector Modal State (Multi-constituency mobile login)
  const [profileSelectionModalOpen, setProfileSelectionModalOpen] = useState(false);
  const [pendingAccountId, setPendingAccountId] = useState<string>("");
  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [selectingProfile, setSelectingProfile] = useState(false);

  // EPIC Search Modal State
  const [epicModalOpen, setEpicModalOpen] = useState(false);
  const [searchEpicNumber, setSearchEpicNumber] = useState("");
  const [searchingEpic, setSearchingEpic] = useState(false);
  const [foundApplications, setFoundApplications] = useState<any[]>([]);

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"MOBILE" | "OTP">("MOBILE");
  const [forgotMobile, setForgotMobile] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Force Change Password Modal State
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Edit Profile Details Modal State
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRelativeName, setEditRelativeName] = useState("");
  const [editRelationType, setEditRelationType] = useState("F");
  const [editGender, setEditGender] = useState("MALE");
  const [editAge, setEditAge] = useState("");
  const [editHouseNo, setEditHouseNo] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLocality, setEditLocality] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Photo Upload State
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Fetch logged in voter profile on mount or token change
  useEffect(() => {
    if (!token) {
      setVoter(null);
      setLoadingProfile(false);
      return;
    }

    async function fetchProfile() {
      setLoadingProfile(true);
      try {
        const response = await api.get("/public/voter-portal/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data?.success) {
          setVoter(response.data.data);
          if (response.data.data.forcePasswordChange) {
            setForcePasswordChange(true);
          }
        }
      } catch (err: any) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        handleLogout();
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [token]);

  const handleLogout = () => {
    sessionStorage.removeItem("voterToken");
    localStorage.removeItem("voterToken");
    setToken(null);
    setVoter(null);
    setForcePasswordChange(false);
  };

  // 1. Application Login
  const handleApplicationLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appNumberInput.trim() || !appPasswordInput.trim()) {
      toast({ title: "Error", description: "Please enter Application Number and Password.", variant: "destructive" });
      return;
    }

    setLoggingInApp(true);
    try {
      const res = await api.post("/public/voter-portal/login/application", {
        applicationNumber: appNumberInput.trim(),
        password: appPasswordInput.trim(),
      });

      if (res.data?.success) {
        const { accessToken, forcePasswordChange: forceChange, voter: voterData } = res.data.data;
        sessionStorage.setItem("voterToken", accessToken);
        localStorage.removeItem("voterToken");
        setToken(accessToken);
        setVoter(voterData);
        if (forceChange) {
          setForcePasswordChange(true);
        }
        toast({ title: "Welcome!", description: `Logged in as ${voterData.name}` });
      }
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.response?.data?.message || "Invalid Application Number or Password",
        variant: "destructive",
      });
    } finally {
      setLoggingInApp(false);
    }
  };

  // 2. Mobile Login
  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumberInput.trim() || !mobilePasswordInput.trim()) {
      toast({ title: "Error", description: "Please enter Mobile Number and Password.", variant: "destructive" });
      return;
    }

    setLoggingInMobile(true);
    try {
      const res = await api.post("/public/voter-portal/login/mobile", {
        mobileNumber: mobileNumberInput.trim(),
        password: mobilePasswordInput.trim(),
      });

      if (res.data?.success) {
        const data = res.data.data;

        if (data.requiresProfileSelection) {
          setPendingAccountId(data.voterAccountId);
          setAvailableProfiles(data.profiles);
          setProfileSelectionModalOpen(true);
        } else {
          sessionStorage.setItem("voterToken", data.accessToken);
          localStorage.removeItem("voterToken");
          setToken(data.accessToken);
          setVoter(data.voter);
          if (data.forcePasswordChange) {
            setForcePasswordChange(true);
          }
          toast({ title: "Welcome!", description: `Logged in as ${data.voter.name}` });
        }
      }
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.response?.data?.message || "Invalid Mobile Number or Password",
        variant: "destructive",
      });
    } finally {
      setLoggingInMobile(false);
    }
  };

  // 3. Select Profile from Multi-Constituency Mobile Login
  const handleSelectProfile = async (membershipId: string) => {
    setSelectingProfile(true);
    try {
      const res = await api.post("/public/voter-portal/select-profile", {
        voterAccountId: pendingAccountId,
        membershipId,
      });

      if (res.data?.success) {
        const { accessToken, forcePasswordChange: forceChange, voter: voterData } = res.data.data;
        sessionStorage.setItem("voterToken", accessToken);
        localStorage.removeItem("voterToken");
        setToken(accessToken);
        setVoter(voterData);
        if (forceChange) {
          setForcePasswordChange(true);
        }
        setProfileSelectionModalOpen(false);
        toast({ title: "Profile Selected", description: `Active profile: ${voterData.name} (${voterData.constituencyName})` });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to select profile", variant: "destructive" });
    } finally {
      setSelectingProfile(false);
    }
  };

  // 4. Search Application Number by EPIC
  const handleSearchEpic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEpicNumber.trim()) {
      toast({ title: "Error", description: "Please enter your EPIC number.", variant: "destructive" });
      return;
    }

    setSearchingEpic(true);
    setFoundApplications([]);
    try {
      const res = await api.get(`/public/voter-portal/search-epic?epicNumber=${encodeURIComponent(searchEpicNumber.trim())}`);
      if (res.data?.success) {
        const data = res.data.data;
        setFoundApplications(Array.isArray(data) ? data : [data]);
      }
    } catch (err: any) {
      toast({
        title: "Search Failed",
        description: err.response?.data?.message || "No voter application found matching this EPIC number.",
        variant: "destructive",
      });
    } finally {
      setSearchingEpic(false);
    }
  };

  // 5. Send Forgot Password OTP
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotMobile.trim()) {
      toast({ title: "Error", description: "Please enter your mobile number.", variant: "destructive" });
      return;
    }

    setSendingOtp(true);
    try {
      const res = await api.post("/public/voter-portal/forgot-password/send-otp", {
        mobileNumber: forgotMobile.trim(),
      });

      if (res.data?.success) {
        setForgotStep("OTP");
        toast({
          title: "OTP Sent",
          description: res.data.message || "An OTP code has been sent to your registered mobile number.",
        });
        if (res.data.devOtp) {
          setForgotOtp(res.data.devOtp);
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to send OTP", variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  };

  // 6. Verify OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || !forgotNewPassword.trim()) {
      toast({ title: "Error", description: "Please fill in the OTP and new password.", variant: "destructive" });
      return;
    }

    setResettingPassword(true);
    try {
      const res = await api.post("/public/voter-portal/forgot-password/verify-reset", {
        mobileNumber: forgotMobile.trim(),
        otpCode: forgotOtp.trim(),
        newPassword: forgotNewPassword.trim(),
      });

      if (res.data?.success) {
        toast({ title: "Success!", description: res.data.message });
        setForgotModalOpen(false);
        setForgotStep("MOBILE");
        setForgotMobile("");
        setForgotOtp("");
        setForgotNewPassword("");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Invalid OTP code", variant: "destructive" });
    } finally {
      setResettingPassword(false);
    }
  };

  // 7. Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordInput || !newPasswordInput) {
      toast({ title: "Error", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      toast({ title: "Error", description: "New password and confirmation do not match.", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post(
        "/public/voter-portal/change-password",
        {
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        toast({ title: "Password Updated", description: "Your password has been changed successfully." });
        setForcePasswordChange(false);
        setChangePasswordModalOpen(false);
        setCurrentPasswordInput("");
        setNewPasswordInput("");
        setConfirmPasswordInput("");
        setVoter((prev: any) => (prev ? { ...prev, forcePasswordChange: false } : null));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to change password", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  // 8. Open Edit Profile Modal
  const openEditProfileModal = () => {
    if (!voter) return;
    setEditName(voter.name || "");
    setEditRelativeName(voter.relativeName || "");
    setEditRelationType(voter.relationType || "F");
    setEditGender(voter.gender || "MALE");
    setEditAge(voter.age ? String(voter.age) : "");
    setEditHouseNo(voter.houseNo || "");
    setEditAddress(voter.address || "");
    setEditLocality(voter.locality || "");
    setEditPhone(voter.phone || "");
    setEditBloodGroup(voter.bloodGroup || "");
    setEditProfileModalOpen(true);
  };

  // 9. Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put(
        "/public/voter-portal/profile",
        {
          name: editName,
          relativeName: editRelativeName,
          relationType: editRelationType,
          gender: editGender,
          age: editAge ? parseInt(editAge, 10) : null,
          houseNo: editHouseNo,
          address: editAddress,
          locality: editLocality,
          phone: editPhone,
          bloodGroup: editBloodGroup === "NONE" ? null : editBloodGroup || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        setVoter(res.data.data);
        toast({ title: "Profile Updated", description: "Your voter details have been updated successfully." });
        setEditProfileModalOpen(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  // 10. Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("photo", file);

    setUploadingPhoto(true);
    try {
      const res = await api.post("/public/voter-portal/profile/photo", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        setVoter((prev: any) => ({ ...prev, photoUrl: res.data.data.photoUrl }));
        toast({ title: "Photo Updated", description: "Profile photo uploaded successfully." });
      }
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.response?.data?.message || "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const orgName = settings?.org_name || "Constituency Management Platform";
  const repName = settings?.representative_name || "Shri Representative";

  // ══════════════════════════════════════════════════════════════
  // RENDER: Loading Profile View
  // ══════════════════════════════════════════════════════════════
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-[#f4f7f6] dark:bg-slate-950 flex flex-col items-center justify-center text-slate-900 dark:text-white relative overflow-hidden font-sans">
        <InteractiveMeshBackground />
        <div className="relative z-10 flex flex-col items-center p-8 rounded-3xl bg-white/80 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-xl shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#13538A] animate-pulse flex items-center justify-center shadow-lg shadow-[#13538A]/30 mb-4">
            <UserCheck className="w-8 h-8 text-white animate-bounce" />
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">Voter Verification Portal</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
            <Loader2 className="w-4 h-4 animate-spin text-[#13538A]" /> Connecting to electoral records...
          </p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER: Unauthenticated Login Screen (Matches Main Login Page Layout & Branding)
  // ══════════════════════════════════════════════════════════════
  if (!token || !voter) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-[#f4f7f6] dark:bg-slate-950 p-4 md:p-8">
        {/* 3D Interactive Mesh Background Wave */}
        <InteractiveMeshBackground />

        <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          {/* ─── LEFT PANEL (Branding & Feature Highlights) ─── */}
          <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-8 text-left lg:pl-4">
            <div className="space-y-4">
              {/* Workspace Badge */}
              <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#13538A]/10 dark:bg-[#13538A]/20 border border-[#13538A]/20 text-[#13538A] dark:text-[#38bdf8] text-xs font-extrabold tracking-wider uppercase">
                {settings?.org_short_name || "CONSTITUENCY WORKSPACE"}
              </div>

              {/* Logo & Headline */}
              <div className="flex items-center gap-3">
                {settings.brand_logo_url ? (
                  <div className="h-14 max-w-[220px] flex items-center justify-center">
                    <img
                      src={getImageUrl(settings.brand_logo_url)}
                      alt="Logo"
                      className="h-full w-auto object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="bg-[#13538A] p-2.5 rounded-xl text-white shadow-md shadow-[#13538A]/20">
                      <Shield className="h-7 w-7" />
                    </div>
                    <span className="text-2xl font-extrabold text-[#13538A] dark:text-white uppercase tracking-tight">
                      {orgName}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs tracking-widest text-[#5D28A8] dark:text-purple-400 font-extrabold uppercase mt-1">
                CITIZEN VOTER VERIFICATION PORTAL
              </p>
            </div>

            {/* Heading */}
            <div className="space-y-3">
              <h1 className="font-['Ubuntu',sans-serif] text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Voter Verification
              </h1>
              <p className="font-['Ubuntu',sans-serif] text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                Log in with your <span className="font-bold text-[#13538A] dark:text-[#38bdf8]">Application Number</span> or <span className="font-bold text-[#13538A] dark:text-[#38bdf8]">Mobile Number</span> to verify, inspect, and update your official constituency voter details.
              </p>
            </div>

            {/* 3 Feature Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Card 1 */}
              <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/60 dark:border-slate-800 rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#13538A] dark:text-blue-400 w-fit mb-3">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Official Record
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Direct sync with official constituency voter records.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/60 dark:border-slate-800 rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 w-fit mb-3">
                  <Zap className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  EPIC Search
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Search by EPIC (Voter ID) to find Application Number instantly.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/60 dark:border-slate-800 rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300 shadow-sm">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 w-fit mb-3">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Multi-Profile
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Single mobile login to manage profiles across constituencies.
                </p>
              </div>
            </div>
          </div>

          {/* ─── RIGHT PANEL (Pixel-Perfect Sign In Card) ─── */}
          <div className="w-full lg:w-[480px] shrink-0">
            <Card className="border-0 shadow-2xl bg-white dark:bg-slate-900/95 backdrop-blur-md rounded-[32px] p-8 md:p-10 relative">
              <CardHeader className="p-0 mb-6 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Voter Login
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#13538A]/30 text-[#13538A] dark:text-[#38bdf8] hover:bg-[#13538A]/10 text-xs font-bold gap-1.5 rounded-xl shrink-0 h-9"
                    onClick={() => {
                      setSearchEpicNumber("");
                      setFoundApplications([]);
                      setEpicModalOpen(true);
                    }}
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span>Find App No.</span>
                  </Button>
                </div>
                <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Access your official constituency voter verification portal.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 space-y-6">
                <Tabs defaultValue="application" className="w-full">
                  {/* Styled Dual-Tab Switcher */}
                  <TabsList className="grid grid-cols-2 h-auto w-full bg-slate-100 dark:bg-slate-950 p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl mb-6 gap-1 items-center">
                    <TabsTrigger
                      value="application"
                      className="rounded-xl py-2.5 px-3 text-xs font-bold transition-all data-[state=active]:bg-[#13538A] data-[state=active]:text-white data-[state=active]:shadow-md flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Application No.</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="mobile"
                      className="rounded-xl py-2.5 px-3 text-xs font-bold transition-all data-[state=active]:bg-[#13538A] data-[state=active]:text-white data-[state=active]:shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Mobile No.</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* ─── TAB 1: Application Number Login ─── */}
                  <TabsContent value="application" className="space-y-5 mt-0">
                    <form onSubmit={handleApplicationLogin} className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between h-5">
                          <Label htmlFor="appNumber" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Application Number
                          </Label>
                          <span className="text-[10px] text-[#13538A] dark:text-[#38bdf8] font-mono font-bold">
                            e.g. APP-2026-000001
                          </span>
                        </div>
                        <div className="relative">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="appNumber"
                            placeholder="APP-2026-XXXXXX"
                            value={appNumberInput}
                            onChange={(e) => setAppNumberInput(e.target.value)}
                            className="h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-[#13538A] focus:ring-4 focus:ring-[#13538A]/10 transition-all font-mono font-semibold text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between h-5">
                          <Label htmlFor="appPassword" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Password
                          </Label>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 italic hidden sm:inline">Default: Application No.</span>
                            <button
                              type="button"
                              className="font-bold text-[#13538A] dark:text-[#38bdf8] hover:underline"
                              onClick={() => {
                                setForgotMobile("");
                                setForgotStep("MOBILE");
                                setForgotModalOpen(true);
                              }}
                            >
                              Forgot password?
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="appPassword"
                            type={showAppPassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={appPasswordInput}
                            onChange={(e) => setAppPasswordInput(e.target.value)}
                            className="h-12 pl-11 pr-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-[#13538A] focus:ring-4 focus:ring-[#13538A]/10 transition-all font-medium text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAppPassword(!showAppPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                            tabIndex={-1}
                          >
                            {showAppPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loggingInApp}
                        className="w-full h-12 rounded-xl bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#13538A]/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                      >
                        {loggingInApp ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <UserCheck className="h-4.5 w-4.5" />
                        )}
                        <span>Log In with Application No.</span>
                      </Button>
                    </form>
                  </TabsContent>

                  {/* ─── TAB 2: Mobile Number Login ─── */}
                  <TabsContent value="mobile" className="space-y-5 mt-0">
                    <form onSubmit={handleMobileLogin} className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between h-5">
                          <Label htmlFor="mobileNumber" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Registered Mobile Number
                          </Label>
                          <span className="text-[10px] text-slate-400 font-medium">
                            10-digit number
                          </span>
                        </div>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="mobileNumber"
                            placeholder="Enter 10-digit mobile number"
                            value={mobileNumberInput}
                            onChange={(e) => setMobileNumberInput(e.target.value)}
                            className="h-12 pl-11 pr-4 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-[#13538A] focus:ring-4 focus:ring-[#13538A]/10 transition-all font-medium text-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between h-5">
                          <Label htmlFor="mobilePassword" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Password
                          </Label>
                          <button
                            type="button"
                            className="text-xs font-bold text-[#13538A] dark:text-[#38bdf8] hover:underline"
                            onClick={() => {
                              setForgotMobile(mobileNumberInput);
                              setForgotStep("MOBILE");
                              setForgotModalOpen(true);
                            }}
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="mobilePassword"
                            type={showMobilePassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={mobilePasswordInput}
                            onChange={(e) => setMobilePasswordInput(e.target.value)}
                            className="h-12 pl-11 pr-11 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-950 focus:border-[#13538A] focus:ring-4 focus:ring-[#13538A]/10 transition-all font-medium text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowMobilePassword(!showMobilePassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                            tabIndex={-1}
                          >
                            {showMobilePassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loggingInMobile}
                        className="w-full h-12 rounded-xl bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold text-sm sm:text-base shadow-lg shadow-[#13538A]/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                      >
                        {loggingInMobile ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <Phone className="h-4.5 w-4.5" />
                        )}
                        <span>Log In with Mobile No.</span>
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {/* EPIC Search Trigger */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    Don't know your Application Number?{" "}
                    <button
                      type="button"
                      className="font-bold text-[#13538A] dark:text-[#38bdf8] hover:underline"
                      onClick={() => {
                        setSearchEpicNumber("");
                        setFoundApplications([]);
                        setEpicModalOpen(true);
                      }}
                    >
                      Search by EPIC (Voter ID)
                    </button>
                  </p>
                </div>

                {/* Reach Support WhatsApp / Phone */}
                <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-center space-y-3">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Trouble signing in? Reach us directly:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href="https://wa.me/9870443528"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[18px] bg-[#00c278] hover:bg-[#00b06d] text-white font-bold text-xs shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>WhatsApp us</span>
                    </a>
                    <a
                      href="tel:+919870443528"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[18px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white font-bold text-xs shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Phone className="h-4 w-4 text-slate-800 dark:text-white" />
                      <span>+91 9870443528</span>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Copyright notice below card */}
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-6 font-semibold">
              © {new Date().getFullYear()} {settings.brand_footer_text || "Vibrantick Infotech Solutions"}. All rights reserved.
            </p>
          </div>
        </div>

        {/* ─── EPIC Search Modal ─── */}
        <Dialog open={epicModalOpen} onOpenChange={setEpicModalOpen}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-md rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 dark:text-white">
                <div className="p-2.5 rounded-xl bg-[#13538A]/10 text-[#13538A] dark:text-[#38bdf8]">
                  <Search className="w-5 h-5" />
                </div>
                <span>Search Application Number</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Enter your EPIC (Voter ID Card) number to locate your constituency application details.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSearchEpic} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="searchEpic" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  EPIC (Voter ID) Number
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="searchEpic"
                    placeholder="e.g. ABC1234567"
                    value={searchEpicNumber}
                    onChange={(e) => setSearchEpicNumber(e.target.value.toUpperCase())}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-mono uppercase rounded-xl h-12 tracking-wider"
                  />
                  <Button type="submit" disabled={searchingEpic} className="bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold h-12 px-5 rounded-xl">
                    {searchingEpic ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
              </div>
            </form>

            {foundApplications.length > 0 && (
              <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Found {foundApplications.length} Application(s):
                </div>
                {foundApplications.map((app, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-[#13538A]/30 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#13538A] dark:text-[#38bdf8]">{app.constituencyName}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-mono text-xs px-2.5 py-0.5 rounded-lg">
                        {app.applicationNumber}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <span className="text-slate-500 dark:text-slate-400 text-xs">Voter Name: </span>
                      <span className="font-bold text-slate-900 dark:text-white">{app.name}</span>
                    </div>
                    {app.wardName && (
                      <div className="text-xs text-slate-500">{app.wardName}</div>
                    )}
                    <Button
                      className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-xs h-10 rounded-xl shadow-md"
                      onClick={() => {
                        setAppNumberInput(app.applicationNumber);
                        setAppPasswordInput(app.applicationNumber);
                        setEpicModalOpen(false);
                        toast({
                          title: "Application Number Selected",
                          description: `Populated ${app.applicationNumber} for ${app.name}. Click Log In!`,
                        });
                      }}
                    >
                      <span>Use Application No. ({app.applicationNumber})</span>
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Multi-Constituency Profile Selection Modal ─── */}
        <Dialog open={profileSelectionModalOpen} onOpenChange={setProfileSelectionModalOpen}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-lg rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 dark:text-white">
                <div className="p-2.5 rounded-xl bg-[#13538A]/10 text-[#13538A] dark:text-[#38bdf8]">
                  <Building2 className="w-5 h-5" />
                </div>
                <span>Select Constituency Profile</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Your mobile number is registered in multiple constituencies. Please choose which profile to open:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 max-h-80 overflow-y-auto">
              {availableProfiles.map((prof) => (
                <div
                  key={prof.membershipId}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-[#13538A] transition-all flex items-center justify-between cursor-pointer group hover:bg-blue-50/50 dark:hover:bg-slate-900"
                  onClick={() => handleSelectProfile(prof.membershipId)}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white group-hover:text-[#13538A] dark:group-hover:text-[#38bdf8] transition-colors flex items-center gap-2">
                      {prof.constituencyName || prof.tenantName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Voter: <span className="text-slate-900 dark:text-slate-200 font-semibold">{prof.voterName}</span>
                    </div>
                    <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">App No: {prof.applicationNumber}</div>
                  </div>
                  <Button size="sm" disabled={selectingProfile} className="bg-[#13538A] hover:bg-[#13538A]/90 text-white rounded-xl font-bold">
                    <span>Select</span>
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Forgot Password OTP Modal ─── */}
        <Dialog open={forgotModalOpen} onOpenChange={setForgotModalOpen}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-md rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 dark:text-white">
                <div className="p-2.5 rounded-xl bg-[#13538A]/10 text-[#13538A] dark:text-[#38bdf8]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <span>Reset Password</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                Verify your registered mobile number to reset your voter portal password.
              </DialogDescription>
            </DialogHeader>

            {forgotStep === "MOBILE" ? (
              <form onSubmit={handleSendForgotOtp} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="forgotMob" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Mobile Number
                  </Label>
                  <Input
                    id="forgotMob"
                    placeholder="Enter registered 10-digit mobile"
                    value={forgotMobile}
                    onChange={(e) => setForgotMobile(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12"
                  />
                </div>
                <Button type="submit" disabled={sendingOtp} className="w-full bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold h-12 rounded-xl shadow-lg">
                  {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Reset OTP Code
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="otpInput" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    6-Digit OTP Code
                  </Label>
                  <Input
                    id="otpInput"
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white tracking-widest text-center text-xl font-mono h-12 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassInput" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    New Secure Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassInput"
                      type={showForgotNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12 pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showForgotNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={resettingPassword} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl shadow-lg">
                  {resettingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify OTP & Reset Password
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER: Authenticated Voter Profile Verification Dashboard
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#f4f7f6] dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col font-sans relative">
      <InteractiveMeshBackground />

      {/* ─── Top Header Navigation ─── */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-6 py-4 sticky top-0 z-30 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3.5">
          {voter.tenant?.logoUrl || settings?.brand_logo_url ? (
            <img
              src={getImageUrl(voter.tenant?.logoUrl || settings.brand_logo_url)}
              alt="Logo"
              className="h-10 w-auto max-w-[150px] object-contain"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-[#13538A] flex items-center justify-center font-extrabold text-white shadow-md">
              MP
            </div>
          )}
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {voter.tenant?.constituencyName || voter.tenant?.name || orgName}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Application No: <span className="font-mono text-[#13538A] dark:text-[#38bdf8] font-bold">{voter.applicationNumber}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setChangePasswordModalOpen(true)}
            className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 text-slate-700 dark:text-slate-300 gap-1.5 rounded-xl font-bold text-xs"
          >
            <Lock className="w-3.5 h-3.5 text-[#13538A] dark:text-[#38bdf8]" />
            <span>Change Password</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLogout}
            className="gap-1.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </Button>
        </div>
      </header>

      {/* ─── Main Voter Dashboard Container ─── */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 my-4">
        {/* Verification Status Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            {/* Avatar Frame with Upload Trigger */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-950 border-2 border-[#13538A]/40 overflow-hidden flex items-center justify-center relative shadow-md">
                {voter.photoUrl ? (
                  <img src={getImageUrl(voter.photoUrl)} alt={voter.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <label
                htmlFor="photoUploadInput"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#13538A] hover:bg-[#13538A]/90 text-white rounded-lg flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-110"
                title="Upload Profile Photo"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="photoUploadInput"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{voter.name}</h2>
                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 px-3 py-1 rounded-full text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Official Verified Record
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                EPIC ID: <span className="font-mono text-[#13538A] dark:text-[#38bdf8] font-bold tracking-wider">{voter.voterIdNumber}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ward #{voter.ward?.wardNumber || "N/A"} - {voter.ward?.name || "N/A"}
              </p>
            </div>
          </div>

          <Button
            onClick={openEditProfileModal}
            className="bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold gap-2 shadow-lg shadow-[#13538A]/25 rounded-2xl px-5 h-11"
          >
            <Edit2 className="w-4 h-4" /> Edit & Verify Details
          </Button>
        </div>

        {/* Profile Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Personal & Family Information */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 py-4 px-6 bg-slate-50/50 dark:bg-slate-950/40">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#13538A] dark:text-[#38bdf8]" /> Personal & Family Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Full Name</span>
                <span className="font-bold text-slate-900 dark:text-white">{voter.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Relative / Guardian</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {voter.relativeName || "Not specified"}{" "}
                  {voter.relationType ? `(${voter.relationType === "F" ? "Father" : voter.relationType === "H" ? "Husband" : "Mother"})` : ""}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Gender</span>
                <span className="font-bold text-slate-900 dark:text-white">{voter.gender}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Age</span>
                <span className="font-bold text-slate-900 dark:text-white">{voter.age ? `${voter.age} Years` : "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Blood Group</span>
                <span className="font-bold text-[#13538A] dark:text-[#38bdf8]">{voter.bloodGroup || "Not specified"}</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Mobile Number</span>
                <span className="font-bold text-[#13538A] dark:text-[#38bdf8] font-mono">{voter.phone || "Not linked"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Electoral & Location Details */}
          <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-xl rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 py-4 px-6 bg-slate-50/50 dark:bg-slate-950/40">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#13538A] dark:text-[#38bdf8]" /> Electoral & Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3.5">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">House Number</span>
                <span className="font-bold text-slate-900 dark:text-white">{voter.houseNo || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Address</span>
                <span className="font-bold text-slate-900 dark:text-white text-right max-w-xs">{voter.address || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Locality / Area</span>
                <span className="font-bold text-slate-900 dark:text-white">{voter.locality || voter.wardArea?.name || "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Booth Number</span>
                <span className="font-bold text-slate-900 dark:text-white">{voter.boothNo ? `Booth #${voter.boothNo}` : "N/A"}</span>
              </div>
              <div className="flex justify-between py-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Section Number</span>
                <span className="font-bold text-slate-900 dark:text-white">{voter.sectionNo ? `Section #${voter.sectionNo}` : "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Mandatory Security Setup Modal */}
      <Dialog open={forcePasswordChange} onOpenChange={() => {}}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-md rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-6 h-6" /> Mandatory Security Setup
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              You are using your initial default password (Application Number). Please create a new secure password to activate full profile access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="currPass" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Password (Application No.)
              </Label>
              <div className="relative">
                <Input
                  id="currPass"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPass" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                New Secure Password
              </Label>
              <div className="relative">
                <Input
                  id="newPass"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPass" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPass"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={changingPassword} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-12 rounded-xl shadow-lg">
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password & Access Profile
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={changePasswordModalOpen} onOpenChange={setChangePasswordModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-md rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 dark:text-white">
              <Lock className="w-5 h-5 text-[#13538A] dark:text-[#38bdf8]" /> Change Password
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Update your voter portal password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="currPassUser" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currPassUser"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassUser" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassUser"
                  type={showNewPassword ? "text" : "password"}
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassUser" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassUser"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={changingPassword} className="w-full bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold h-12 rounded-xl shadow-lg">
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Details Modal */}
      <Dialog open={editProfileModalOpen} onOpenChange={setEditProfileModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl font-extrabold text-slate-900 dark:text-white">
              <Edit2 className="w-5 h-5 text-[#13538A] dark:text-[#38bdf8]" /> Update & Verify Details
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Update your voter information. Mandatory fields are Name, Relative Name and Phone.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editName" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Full Name
                </Label>
                <Input
                  id="editName"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRelName" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Relative / Guardian Name
                </Label>
                <Input
                  id="editRelName"
                  value={editRelativeName}
                  onChange={(e) => setEditRelativeName(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRelType" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Relation Type
                </Label>
                <Select value={editRelationType} onValueChange={setEditRelationType}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12">
                    <SelectValue placeholder="Select relation" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectItem value="F">Father</SelectItem>
                    <SelectItem value="H">Husband</SelectItem>
                    <SelectItem value="M">Mother</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editGender" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Gender
                </Label>
                <Select value={editGender} onValueChange={setEditGender}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="TRANSGENDER">Transgender</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAge" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Age
                </Label>
                <Input
                  id="editAge"
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editBloodGroup" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Blood Group (Optional)
                </Label>
                <Select value={editBloodGroup || "NONE"} onValueChange={setEditBloodGroup}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                    <SelectItem value="NONE">Not specified</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editPhone" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Mobile Number
                </Label>
                <Input
                  id="editPhone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12"
                  placeholder="Enter 10-digit mobile number"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editHouse" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  House Number
                </Label>
                <Input
                  id="editHouse"
                  value={editHouseNo}
                  onChange={(e) => setEditHouseNo(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editAddress" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Address
                </Label>
                <Input
                  id="editAddress"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="editLocality" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Locality / Area
                </Label>
                <Input
                  id="editLocality"
                  value={editLocality}
                  onChange={(e) => setEditLocality(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl h-12"
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setEditProfileModalOpen(false)} className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={savingProfile} className="bg-[#13538A] hover:bg-[#13538A]/90 text-white font-bold rounded-xl h-12 px-5 shadow-lg">
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Details
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
