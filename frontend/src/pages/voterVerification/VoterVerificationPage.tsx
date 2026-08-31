import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/lib/api";
import { useVoterVerification } from "@/hooks/useVoterVerification";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Phone,
  MapPin,
  User,
  Calendar,
  Camera,
  Edit2,
  Fingerprint,
} from "lucide-react";
import { InteractiveMeshBackground } from "@/components/ui/InteractiveMeshBackground";

const searchSchema = z.object({
  epicNumber: z.string().min(3, "EPIC number must be at least 3 characters"),
  tenantId: z.string().min(1, "Please select a constituency"),
});

const voterUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  relativeName: z.string().min(2, "Relative name is required"),
  age: z.coerce.number().int().min(18, "Age must be at least 18").max(120, "Invalid age"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

type SearchForm = z.infer<typeof searchSchema>;
type VoterUpdateForm = z.infer<typeof voterUpdateSchema>;

export default function VoterVerificationPage() {
  const { toast } = useToast();
  const { searchVoter, startAadhaarVerification, updateVoterDetails } = useVoterVerification();

  const [constituencies, setConstituencies] = useState<any[]>([]);
  const [loadingConstituencies, setLoadingConstituencies] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  const [searching, setSearching] = useState(false);
  const [voterRecord, setVoterRecord] = useState<any | null>(null);

  // Edit details state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [updatingVoter, setUpdatingVoter] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Aadhaar section state
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [submittingAadhaar, setSubmittingAadhaar] = useState(false);
  const [aadhaarError, setAadhaarError] = useState<string | null>(null);

  // Load constituencies on mount
  useEffect(() => {
    async function loadConstituencies() {
      try {
        const response = await api.get("/public/constituencies");
        if (response.data?.success) {
          setConstituencies(response.data.data);
          if (response.data.data.length > 0) {
            setSelectedTenantId(response.data.data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load constituencies:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load constituency directory.",
        });
      } finally {
        setLoadingConstituencies(false);
      }
    }
    loadConstituencies();
  }, [toast]);

  // Search form
  const {
    register: searchRegister,
    handleSubmit: handleSearchSubmit,
    formState: { errors: searchErrors },
    setValue: setSearchValue,
  } = useForm<SearchForm>({
    resolver: zodResolver(searchSchema),
    defaultValues: { epicNumber: "", tenantId: "" },
  });

  useEffect(() => {
    if (selectedTenantId) {
      setSearchValue("tenantId", selectedTenantId);
    }
  }, [selectedTenantId, setSearchValue]);

  // Update form
  const {
    register: updateRegister,
    handleSubmit: handleUpdateSubmit,
    formState: { errors: updateErrors },
    reset: resetUpdateForm,
    setValue: setUpdateValue,
    watch: watchUpdate,
  } = useForm<VoterUpdateForm>({
    resolver: zodResolver(voterUpdateSchema),
  });

  const onSearch = async (data: SearchForm) => {
    setSearching(true);
    setVoterRecord(null);
    setAadhaarNumber("");
    setAadhaarError(null);
    try {
      const record = await searchVoter(data.epicNumber, data.tenantId);
      setVoterRecord(record);
      toast({
        title: "Record Found",
        description: "Voter roll record has been fetched successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: err.response?.data?.message || "EPIC number not found in this constituency.",
      });
    } finally {
      setSearching(false);
    }
  };

  const openEditDialog = () => {
    if (!voterRecord) return;
    setPhotoFile(null);
    setPhotoPreview(voterRecord.photoUrl ? `${api.defaults.baseURL || ""}${voterRecord.photoUrl}` : null);
    resetUpdateForm({
      name: voterRecord.name,
      relativeName: voterRecord.relativeName,
      age: voterRecord.age || 18,
      gender: voterRecord.gender,
      phone: voterRecord.phone || "",
      address: voterRecord.address || "",
    });
    setIsEditDialogOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onUpdateVoter = async (data: VoterUpdateForm) => {
    if (!voterRecord) return;
    setUpdatingVoter(true);
    try {
      const formPayload = new FormData();
      formPayload.append("name", data.name);
      formPayload.append("relativeName", data.relativeName);
      formPayload.append("age", data.age.toString());
      formPayload.append("gender", data.gender);
      if (data.phone) formPayload.append("phone", data.phone);
      if (data.address) formPayload.append("address", data.address);
      if (photoFile) {
        formPayload.append("photo", photoFile);
      }

      const updated = await updateVoterDetails(voterRecord.id, formPayload, selectedTenantId);
      setVoterRecord(updated);
      setIsEditDialogOpen(false);
      toast({
        title: "Update Successful",
        description: "Voter details have been updated successfully.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.response?.data?.message || "Failed to update voter details.",
      });
    } finally {
      setUpdatingVoter(false);
    }
  };

  const handleAadhaarVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterRecord || !aadhaarNumber) return;
    setSubmittingAadhaar(true);
    setAadhaarError(null);
    try {
      await startAadhaarVerification(voterRecord.id, aadhaarNumber, selectedTenantId);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Verification service is currently unavailable.";
      setAadhaarError(errMsg);
      toast({
        variant: "destructive",
        title: "Service Unavailable",
        description: errMsg,
      });
    } finally {
      setSubmittingAadhaar(false);
    }
  };

  const selectedGender = watchUpdate("gender");

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden font-sans bg-[#f4f7f6] dark:bg-slate-950 p-4 md:p-8">
      {/* 3D Interactive Mesh Background */}
      <InteractiveMeshBackground />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#13538A]/10 dark:bg-[#13538A]/20 border border-[#13538A]/20 text-[#13538A] dark:text-[#38bdf8] text-[10px] font-bold tracking-widest uppercase">
            Citizen Verification Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            Voter Details Verification
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Locate your electoral record and verify identity using Aadhaar securely.
          </p>
        </div>

        {/* Main Search Panel */}
        <Card className="rounded-3xl border-border/40 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md overflow-hidden">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="h-4.5 w-4.5 text-[#13538A]" /> Find Your Details
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground">
              Select constituency and enter your EPIC/Voter ID number.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <form onSubmit={handleSearchSubmit(onSearch)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tenantId" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Constituency / Area
                </Label>
                {loadingConstituencies ? (
                  <div className="h-10 w-full flex items-center justify-center border border-border/40 rounded-xl bg-slate-50 dark:bg-slate-950">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Select
                    value={selectedTenantId}
                    onValueChange={(val) => {
                      setSelectedTenantId(val);
                      setSearchValue("tenantId", val);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-border/40 bg-slate-50/50 dark:bg-slate-950/50">
                      <SelectValue placeholder="Select Constituency" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {constituencies.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.constituencyName} ({c.district}, {c.state})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {searchErrors.tenantId && (
                  <span className="text-[10px] font-semibold text-rose-500">{searchErrors.tenantId.message}</span>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="epicNumber" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  EPIC / Voter ID Number
                </Label>
                <div className="relative">
                  <Input
                    id="epicNumber"
                    type="text"
                    placeholder="Enter Voter ID (e.g. ABC1234567)"
                    className="h-11 rounded-xl pl-3 uppercase border-border/40 bg-slate-50/50 dark:bg-slate-950/50 font-semibold"
                    {...searchRegister("epicNumber")}
                  />
                </div>
                {searchErrors.epicNumber && (
                  <span className="text-[10px] font-semibold text-rose-500">{searchErrors.epicNumber.message}</span>
                )}
              </div>

              <Button
                type="submit"
                disabled={searching}
                className="w-full h-11 font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 flex items-center justify-center gap-2 shadow-md transition-all"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Find My Details
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Voter details block (conditional) */}
        {voterRecord && (
          <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Record Panel */}
            <Card className="rounded-3xl border-border/40 shadow-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/40 bg-slate-50/30 dark:bg-slate-950/10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Voter Roll Profile
                  </CardTitle>
                  <CardDescription className="text-[11px] text-muted-foreground">
                    Record matching the entered EPIC identifier.
                  </CardDescription>
                </div>
                <Button
                  onClick={openEditDialog}
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs font-bold gap-1 border-border/60 hover:bg-slate-100 dark:hover:bg-slate-800 h-9"
                >
                  <Edit2 className="h-3 w-3" /> Update Details
                </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Photo & Details row */}
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="relative group">
                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-[#13538A] shadow-md bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                      {voterRecord.photoUrl ? (
                        <img
                          src={`${api.defaults.baseURL || ""}${voterRecord.photoUrl}`}
                          alt="Voter Portrait"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-12 w-12 text-slate-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Name</span>
                        <p className="text-sm font-extrabold text-foreground">{voterRecord.name}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Relation</span>
                        <p className="text-sm font-semibold text-foreground">{voterRecord.relativeName}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Age</span>
                        <p className="text-sm font-semibold text-foreground">{voterRecord.age || "N/A"} Yrs</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">Gender</span>
                        <p className="text-sm font-semibold text-foreground uppercase">{voterRecord.gender}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Phone:
                    </span>
                    <span className="font-bold text-foreground">{voterRecord.phone || "Not Registered"}</span>
                  </div>
                  <div className="flex items-start justify-between text-xs">
                    <span className="text-muted-foreground font-semibold flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" /> Address:
                    </span>
                    <span className="font-bold text-foreground text-right max-w-[200px] line-clamp-2">
                      {voterRecord.address || "N/A"}
                    </span>
                  </div>
                </div>

                {/* Aadhaar Verification Panel */}
                <div className="mt-6 pt-6 border-t border-border/40 space-y-4">
                  <div className="bg-[#13538A]/5 border border-[#13538A]/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <Fingerprint className="h-6 w-6 text-[#13538A] mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-white">Verify identity using Aadhaar</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Cross-reference and verify voter identity using standard OTP verification.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleAadhaarVerification} className="space-y-3 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="aadhaar" className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          Aadhaar Number
                        </Label>
                        <Input
                          id="aadhaar"
                          type="text"
                          maxLength={12}
                          placeholder="Enter 12-digit Aadhaar number"
                          className="h-10 rounded-xl border-border/40 bg-white dark:bg-slate-950 font-semibold"
                          value={aadhaarNumber}
                          onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ""))}
                        />
                      </div>

                      {aadhaarError && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2 text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <span>{aadhaarError}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={submittingAadhaar || aadhaarNumber.length !== 12}
                        className="w-full h-10 font-bold text-xs rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#13538A] dark:hover:bg-[#13538A]/90 flex items-center justify-center gap-1.5"
                      >
                        {submittingAadhaar ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying...
                          </>
                        ) : (
                          <>
                            <Fingerprint className="h-3.5 w-3.5" /> Verify with Aadhaar
                          </>
                        )}
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Edit Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl max-w-md w-full bg-white dark:bg-slate-900 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-foreground uppercase tracking-wider">
              Update Voter Details
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Modify the voter details below. These changes will be reflected in the voter register.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateSubmit(onUpdateVoter)} className="space-y-4 pt-4 border-t border-border/40">
            {/* Photo Uploader */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-[#13538A] bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-10 w-10 text-slate-400" />
                  )}
                </div>
                <Label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-[#13538A] border border-white text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-[#13538A]/95 transition-all"
                >
                  <Camera className="h-3.5 w-3.5" />
                </Label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-semibold">Upload Portrait Photo</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  className="h-10 rounded-xl text-xs font-semibold"
                  {...updateRegister("name")}
                />
                {updateErrors.name && (
                  <span className="text-[9px] font-semibold text-rose-500">{updateErrors.name.message}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="relativeName" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Relative Name
                </Label>
                <Input
                  id="relativeName"
                  type="text"
                  className="h-10 rounded-xl text-xs font-semibold"
                  {...updateRegister("relativeName")}
                />
                {updateErrors.relativeName && (
                  <span className="text-[9px] font-semibold text-rose-500">{updateErrors.relativeName.message}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="age" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Age
                </Label>
                <Input
                  id="age"
                  type="number"
                  className="h-10 rounded-xl text-xs font-semibold"
                  {...updateRegister("age")}
                />
                {updateErrors.age && (
                  <span className="text-[9px] font-semibold text-rose-500">{updateErrors.age.message}</span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Gender
                </Label>
                <Select
                  value={selectedGender}
                  onValueChange={(val) => setUpdateValue("gender", val as any)}
                >
                  <SelectTrigger className="h-10 rounded-xl text-xs font-semibold">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="MALE" className="text-xs">Male</SelectItem>
                    <SelectItem value="FEMALE" className="text-xs">Female</SelectItem>
                    <SelectItem value="OTHER" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
                {updateErrors.gender && (
                  <span className="text-[9px] font-semibold text-rose-500">{updateErrors.gender.message}</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="text"
                placeholder="Enter 10-digit number"
                className="h-10 rounded-xl text-xs font-semibold"
                {...updateRegister("phone")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Address Details
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="Locality, House No, Ward details"
                className="h-10 rounded-xl text-xs font-semibold"
                {...updateRegister("address")}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-border/40 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="rounded-xl h-10 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingVoter}
                className="rounded-xl h-10 text-xs font-bold bg-[#13538A] hover:bg-[#13538A]/90 text-white flex items-center justify-center gap-1.5"
              >
                {updatingVoter ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
