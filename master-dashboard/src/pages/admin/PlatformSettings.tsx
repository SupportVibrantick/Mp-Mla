import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { platformSettingsApi } from "@/lib/api";
import { useRegenerateInvoices } from "@/hooks/usePayments";
import { CreditCard, Palette, Settings, ShieldCheck, RefreshCw } from "lucide-react";

export default function PlatformSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => platformSettingsApi.list().then((r) => r.data.data),
  });

  const regenerateMutation = useRegenerateInvoices();
  const [values, setValues] = useState<Record<string, string>>({});

  const groupedData: Record<string, any[]> = data || {};

  const getSettingValue = (setting: any) => values[setting.key] ?? setting.value ?? "";

  const save = useMutation({
    mutationFn: () => {
      const allSettings: any[] = [];
      Object.values(groupedData).forEach((groupItems) => {
        groupItems.forEach((s) => {
          allSettings.push({
            key: s.key,
            value: String(values[s.key] ?? s.value ?? ""),
          });
        });
      });
      return platformSettingsApi.update({ settings: allSettings });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Settings Saved", description: res.data.message || "Platform settings updated successfully." });
    },
    onError: (err: any) => {
      toast({
        title: "Save Failed",
        description: err?.response?.data?.message || "Could not save platform settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <MainLayout title="Platform Settings">
        <div className="p-8 text-center text-muted-foreground">Loading platform configuration...</div>
      </MainLayout>
    );
  }

  const renderSettingField = (setting: any) => {
    const val = getSettingValue(setting);

    return (
      <div key={setting.key} className="space-y-2 p-4 rounded-xl border border-border/60 bg-muted/20">
        <div className="flex items-center justify-between">
          <Label className="font-semibold text-sm">{setting.label || setting.key.replace(/_/g, " ")}</Label>
          <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 rounded bg-muted">
            {setting.key}
          </span>
        </div>

        {setting.type === "boolean" ? (
          <div className="pt-1">
            <Switch
              checked={val === "true"}
              onCheckedChange={(checked) =>
                setValues((v) => ({
                  ...v,
                  [setting.key]: checked ? "true" : "false",
                }))
              }
            />
          </div>
        ) : setting.type === "color" ? (
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={val || "#0284c7"}
              onChange={(e) => setValues((v) => ({ ...v, [setting.key]: e.target.value }))}
              className="w-10 h-10 rounded-lg cursor-pointer border border-border"
            />
            <Input
              value={val}
              onChange={(e) => setValues((v) => ({ ...v, [setting.key]: e.target.value }))}
              className="font-mono max-w-[140px]"
            />
          </div>
        ) : (
          <Input
            value={val}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                [setting.key]: e.target.value,
              }))
            }
            placeholder={`Enter ${setting.label || setting.key}...`}
          />
        )}

        {setting.description && (
          <p className="text-xs text-muted-foreground">{setting.description}</p>
        )}
      </div>
    );
  };

  return (
    <MainLayout title="Platform Settings">
      <div className="space-y-8 max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure global SaaS operator options, invoice details, theme colors, and security.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => regenerateMutation.mutate(undefined)}
              disabled={regenerateMutation.isPending}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${regenerateMutation.isPending ? "animate-spin" : ""}`} />
              Regenerate Invoices
            </Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="px-6 font-semibold"
            >
              {save.isPending ? "Saving..." : "Save All Settings"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="billing" className="space-y-6">
          <TabsList className="bg-muted/60 p-1 rounded-xl gap-1">
            <TabsTrigger value="billing" className="rounded-lg gap-2">
              <CreditCard className="w-4 h-4" />
              Invoice & Billing
            </TabsTrigger>
            <TabsTrigger value="branding" className="rounded-lg gap-2">
              <Palette className="w-4 h-4" />
              Branding & Theme
            </TabsTrigger>
            <TabsTrigger value="general" className="rounded-lg gap-2">
              <Settings className="w-4 h-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-lg gap-2">
              <ShieldCheck className="w-4 h-4" />
              Security & Notifications
            </TabsTrigger>
          </TabsList>

          {/* Billing & Invoice Tab */}
          <TabsContent value="billing">
            <Card className="rounded-2xl border border-border/60">
              <CardHeader>
                <CardTitle className="text-xl">Invoice Branding & Bank Details</CardTitle>
                <CardDescription>
                  Configure company legal name, tax GSTIN, header logo, bank settlement accounts, and footer notes printed on all tenant invoices.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(groupedData["billing"] || []).map(renderSettingField)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding">
            <Card className="rounded-2xl border border-border/60">
              <CardHeader>
                <CardTitle className="text-xl">Platform Color Theme & Logos</CardTitle>
                <CardDescription>
                  Set primary MP-MLA theme colors, party logos, favicons, and portal visual elements.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(groupedData["branding"] || []).map(renderSettingField)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general">
            <Card className="rounded-2xl border border-border/60">
              <CardHeader>
                <CardTitle className="text-xl">General System Settings</CardTitle>
                <CardDescription>
                  Platform operator title, support email, and creation rules.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(groupedData["general"] || []).map(renderSettingField)}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security & Notifications Tab */}
          <TabsContent value="security">
            <Card className="rounded-2xl border border-border/60">
              <CardHeader>
                <CardTitle className="text-xl">Security, SMTP & Backup Settings</CardTitle>
                <CardDescription>
                  Session timeouts, login policies, SMTP email servers, and automated backups.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ...(groupedData["security"] || []),
                  ...(groupedData["email_smtp"] || []),
                  ...(groupedData["backup"] || []),
                ].map(renderSettingField)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

