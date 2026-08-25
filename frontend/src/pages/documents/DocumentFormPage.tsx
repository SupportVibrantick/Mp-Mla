import { useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useDocument,
  useCreateDocument,
  useUpdateDocument,
  DOCUMENT_CATEGORIES,
} from "@/hooks/useDocuments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { MainLayout } from "@/components/layout/MainLayout";
import { ArrowLeft, Save, FileText, Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  category: z.string().default("GENERAL"),
  fileName: z.string().min(1, "File name required"),
  fileUrl: z.string().min(1, "File URL required"),
  fileType: z.string().optional(),
  fileSize: z.coerce.number().optional(),
});
type FV = z.infer<typeof formSchema>;

export default function DocumentFormPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isEdit = !!id;
  const { data: dRes, isLoading } = useDocument(id);
  const createMut = useCreateDocument();
  const updateMut = useUpdateDocument();

  const d = dRes?.data;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FV>({
    resolver: zodResolver(formSchema),
    defaultValues: { category: "GENERAL" },
  });

  useEffect(() => {
    if (!d || !isEdit) return;
    reset({
      name: d.name,
      description: d.description || "",
      category: d.category,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      fileType: d.fileType || "",
      fileSize: d.fileSize || undefined,
    });
  }, [d, isEdit, reset]);

  const onSubmit = async (data: FV) => {
    const payload: any = {
      ...data,
      description: data.description || undefined,
      fileType: data.fileType || undefined,
      fileSize: data.fileSize || undefined,
    };
    if (isEdit && id) {
      // Update only metadata fields
      await updateMut.mutateAsync({
        id,
        data: {
          name: data.name,
          description: data.description || undefined,
          category: data.category,
        },
      });
      navigate(`/documents/${id}`);
    } else {
      const res = await createMut.mutateAsync(payload);
      navigate(`/documents/${res.data.id}`);
    }
  };

  const saving = createMut.isPending || updateMut.isPending;
  if (isEdit && isLoading)
    return (
      <MainLayout title="Edit Document">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );

  return (
    <MainLayout title={isEdit ? "Edit Document" : "Upload Document"}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <Link to="/documents">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            {isEdit ? `Edit ${d?.name}` : "Upload Document"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input {...register("name")} placeholder="Document name" />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select
                      key={field.value}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                {...register("description")}
                placeholder="What is this document about?"
                rows={2}
              />
            </div>
            {!isEdit && (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      File Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...register("fileName")}
                      placeholder="report-2024.pdf"
                    />
                    {errors.fileName && (
                      <p className="text-xs text-destructive">
                        {errors.fileName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>File Type</Label>
                    <Input
                      {...register("fileType")}
                      placeholder="application/pdf"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      File URL <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      {...register("fileUrl")}
                      placeholder="https://storage.example.com/file.pdf"
                    />
                    {errors.fileUrl && (
                      <p className="text-xs text-destructive">
                        {errors.fileUrl.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>File Size (bytes)</Label>
                    <Input
                      type="number"
                      {...register("fileSize")}
                      placeholder="102400"
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pb-6">
          <Link to="/documents">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            className="gap-2 min-w-[160px]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEdit ? "Update" : "Upload"} Document
              </>
            )}
          </Button>
        </div>
      </form>
    </MainLayout>
  );
}