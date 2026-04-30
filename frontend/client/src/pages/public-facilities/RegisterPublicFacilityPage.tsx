import { useState, useMemo, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  usePublicWards,
  useSubmitPublicFacilityRequest,
} from "@/hooks/usePublicFacilityRequests";
import { PUBLIC_FACILITY_CATEGORIES } from "@/hooks/usePublicFacilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@/components/ui/select";
import {
  Building2,
  CheckCircle2,
  Loader2,
  Send,
  User,
  FileText,
  Upload,
  X,
  Shield,
  FileCheck,
  Home,
} from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Public facility name is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  wardId: z.string().min(1, "Ward is required"),
  contactNo: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
  capacity: z.coerce.number().int().min(0).optional(),
  establishedDate: z.string().optional(),
  submitterName: z.string().min(1, "Your name is required"),
  submitterPhone: z.string().min(1, "Your phone number is required"),
  submitterEmail: z.string().optional(),
  headName: z.string().min(1, "Head name is required"),
  headDesignation: z.string().min(1, "Head designation is required"),
  headContact: z.string().min(1, "Head contact is required"),
  headAdharNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits")
    .optional()
    .or(z.literal("")),
  headEmail: z.string().optional(),
  headDateOfBirth: z.string().optional(),
  headAppointedDate: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function FileUploadField({
  label,
  description,
  icon: Icon,
  file,
  onFileChange,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx",
}: {
  label: string;
  description: string;
  icon: any;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer hover:border-primary/50 hover:bg-primary/5 ${file
          ? "border-primary/50 bg-primary/5"
          : "border-muted-foreground/25"
        }`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files?.[0] || null)}
      />
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${file
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
            }`}
        >
          {file ? (
            <FileCheck className="h-5 w-5" />
          ) : (
            <Icon className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          {file ? (
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant="secondary"
                className="bg-primary/10 text-primary hover:bg-primary/20 text-xs max-w-[200px] truncate"
              >
                {file.name}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileChange(null);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
              <Upload className="h-3 w-3" /> Click to upload
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RegisterPublicFacilityPage() {
  const [submitted, setSubmitted] = useState(false);
  const [publicFacilityProof, setPublicFacilityProof] = useState<File | null>(null);
  const [identityProof, setIdentityProof] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);
  const { data: wardsRes } = usePublicWards();
  const submitMut = useSubmitPublicFacilityRequest();
  const wards = wardsRes?.data || [];

  const categoryGroups = useMemo(() => {
    const groups: Record<string, (typeof PUBLIC_FACILITY_CATEGORIES)[number][]> =
      {};
    PUBLIC_FACILITY_CATEGORIES.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    return groups;
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      address: "",
      wardId: "",
      submitterName: "",
      submitterPhone: "",
      headName: "",
      headDesignation: "",
      headContact: "",
      headAdharNumber: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const formData = new FormData();

      // Append all text fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          formData.append(key, String(value));
        }
      });

      // Append document files
      if (publicFacilityProof) formData.append("institutionProof", publicFacilityProof);
      if (identityProof) formData.append("identityProof", identityProof);
      if (addressProof) formData.append("addressProof", addressProof);

      await submitMut.mutateAsync(formData);
      setSubmitted(true);
    } catch {
      /* handled by hook */
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-lg border">
          <CardContent className="p-10 space-y-5">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100/50 dark:bg-green-500/10 mx-auto">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Request Submitted
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">
              Your public facility registration request has been submitted
              successfully. The administration will review your documents and
              you will be notified once it is approved.
            </p>
            <div className="pt-2">
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setPublicFacilityProof(null);
                  setIdentityProof(null);
                  setAddressProof(null);
                }}
                variant="outline"
                size="lg"
              >
                Submit Another Request
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-card border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Register Your Public Facility
              </h1>
            </div>
            <p className="text-muted-foreground max-w-2xl text-base leading-relaxed">
              Fill in the details below to register your public facility with the
              Constituency Management Portal. Your request will be reviewed and verified
              by the administration before approval.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
      >
        {/* Section 1: Submitter Info */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Your Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("submitterName")}
                  placeholder="Full name"
                />
                {errors.submitterName && (
                  <p className="text-xs text-destructive">
                    {errors.submitterName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Phone <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("submitterPhone")}
                  placeholder="9876543210"
                />
                {errors.submitterPhone && (
                  <p className="text-xs text-destructive">
                    {errors.submitterPhone.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  {...register("submitterEmail")}
                  placeholder="you@email.com"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Institution Details */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              Public Facility Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("name")}
                  placeholder="e.g. City Hospital"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectScrollUpButton />
                        {Object.entries(categoryGroups).map(
                          ([group, cats]) => (
                            <div key={group}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {group}
                              </div>
                              {cats.map((c) => (
                                <SelectItem key={c.value} value={c.value}>
                                  <span className="flex items-center gap-2">
                                    <img
                                      src={c.icon}
                                      alt={c.label}
                                      className="h-4 w-4 object-contain"
                                    />
                                    {c.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </div>
                          ),
                        )}
                        <SelectScrollDownButton />
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Ward <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="wardId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ward" />
                      </SelectTrigger>
                      <SelectContent>
                        {wards.map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>
                            #{w.wardNumber} {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.wardId && (
                  <p className="text-xs text-destructive">
                    {errors.wardId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Input
                  {...register("subcategory")}
                  placeholder="e.g. Primary, Multi-specialty"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Address <span className="text-destructive">*</span>
              </Label>
              <Input {...register("address")} placeholder="Full address" />
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Number</Label>
                <Input
                  {...register("contactNo")}
                  placeholder="011-2345678"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  {...register("email")}
                  placeholder="contact@inst.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input {...register("website")} placeholder="https://..." />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity</Label>
                <Input
                  type="number"
                  {...register("capacity")}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="space-y-2">
                <Label>Established Date</Label>
                <Input type="date" {...register("establishedDate")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description")}
                placeholder="About this public facility..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Head/Incharge */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Head / Incharge Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input {...register("headName")} placeholder="Full name" />
                {errors.headName && (
                  <p className="text-xs text-destructive">
                    {errors.headName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Designation <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("headDesignation")}
                  placeholder="e.g. Principal"
                />
                {errors.headDesignation && (
                  <p className="text-xs text-destructive">
                    {errors.headDesignation.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Contact <span className="text-destructive">*</span>
                </Label>
                <Input
                  {...register("headContact")}
                  placeholder="9876543210"
                />
                {errors.headContact && (
                  <p className="text-xs text-destructive">
                    {errors.headContact.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Aadhaar Number</Label>
                <Input
                  {...register("headAdharNumber")}
                  placeholder="1234 5678 9012"
                  maxLength={12}
                />
                {errors.headAdharNumber && (
                  <p className="text-xs text-destructive">
                    {errors.headAdharNumber.message}
                  </p>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  {...register("headEmail")}
                  placeholder="head@inst.com"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input type="date" {...register("headDateOfBirth")} />
              </div>
              <div className="space-y-2">
                <Label>Appointed Date</Label>
                <Input type="date" {...register("headAppointedDate")} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: KYC Document Upload */}
        <Card className="shadow-sm border">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <div className="flex flex-col gap-1.5">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                Upload KYC Documents
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload documents for verification. Accepted formats: PDF, JPG,
                PNG, DOC (max 10MB each)
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <FileUploadField
              label="Public Facility Proof"
              description="Registration Certificate, Government Approval, Establishment Certificate, or Department Authorization Letter"
              icon={FileText}
              file={publicFacilityProof}
              onFileChange={setPublicFacilityProof}
            />
            <FileUploadField
              label="Identity of Head / Incharge"
              description="Aadhaar Card, PAN Card, Voter ID, Government Employee ID, or Official Appointment Letter"
              icon={User}
              file={identityProof}
              onFileChange={setIdentityProof}
            />
            <FileUploadField
              label="Address Proof"
              description="Electricity Bill, Property Tax Receipt, or Government Allotment Letter"
              icon={Home}
              file={addressProof}
              onFileChange={setAddressProof}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end pt-4 pb-8">
          <Button
            type="submit"
            size="lg"
            disabled={submitMut.isPending}
            className="w-full sm:w-auto min-w-[220px]"
          >
            {submitMut.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Submit Registration
          </Button>
        </div>
      </form>
    </div>
  );
}
