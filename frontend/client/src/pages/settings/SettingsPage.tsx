import { useState, useEffect, useMemo } from "react";
import {
  useSettings,
  useUpdateSettings,
  useResetSettings,
  SETTING_GROUPS,
} from "@/hooks/useSettings";
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
import { cn } from "@/lib/utils";
import {
  Settings,
  Save,
  RotateCcw,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  Shield,
  Bell,
  Palette,
  Database,
  ClipboardList,
} from "lucide-react";

const GROUP_ICONS: Record<string, any> = {
  general: Settings,
  branding: Palette,
  security: Shield,
  grievance: ClipboardList,
  notifications: Bell,
  backup: Database,
};

export default function SettingsPage() {
  const { data: res, isLoading } = useSettings();
  const updateMut = useUpdateSettings();
  const resetMut = useResetSettings();

  const [activeGroup, setActiveGroup] = useState("general");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const allSettings = res?.data || {};

  // Initialize form values from server
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

  const updateValue = (key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    // Only send changed values for active group
    const changes = groupSettings
      .filter((s: any) => {
        const current = formValues[s.key] ?? "";
        return (
          current !== (s.value || "") && !(s.masked && current.includes("••••"))
        );
      })
      .map((s: any) => ({ key: s.key, value: formValues[s.key] ?? "" }));

    if (changes.length === 0) {
      setDirty(false);
      return;
    }
    await updateMut.mutateAsync(changes);
    setDirty(false);
  };

  const renderField = (s: any) => {
    const value = formValues[s.key] ?? "";
    const key = s.key;

    switch (s.type) {
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
        <div className="max-w-5xl mx-auto">
          <Skeleton className="h-[600px]" />
        </div>
      </MainLayout>
    );

  const GroupIcon = GROUP_ICONS[activeGroup] || Settings;

  return (
    <MainLayout title="Settings">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="h-7 w-7 text-primary" />
              System Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure platform, security & notifications
            </p>
          </div>
          <div className="flex gap-2">
            {dirty && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-300 animate-pulse"
              >
                Unsaved Changes
              </Badge>
            )}
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
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <div className="w-full lg:w-56 flex-shrink-0">
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
              {SETTING_GROUPS.map((g) => {
                const Icon = GROUP_ICONS[g.id] || Settings;
                const isActive = activeGroup === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroup(g.id)}
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
                    {SETTING_GROUPS.find((g) => g.id === activeGroup)?.label}{" "}
                    Settings
                  </CardTitle>
                  <CardDescription>
                    {SETTING_GROUPS.find((g) => g.id === activeGroup)?.desc}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Separate booleans from other fields */}
              {(() => {
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
                              s.type === "textarea" ? "sm:col-span-2" : ""
                            }
                          >
                            {renderField(s)}
                          </div>
                        ))}
                      </div>
                    )}
                    {booleans.length > 0 && others.length > 0 && <Separator />}
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
