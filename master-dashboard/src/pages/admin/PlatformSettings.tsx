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
import { useToast } from "@/hooks/use-toast";
import { platformSettingsApi } from "@/lib/api";

export default function PlatformSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => platformSettingsApi.list().then((r) => r.data.data),
  });

  const [values, setValues] = useState<Record<string, string>>({});

  const flatSettings = Object.values(data || {})
    .flat()
    .map((s: any) => ({
      ...s,
      value: values[s.key] ?? s.value,
    }));

  const save = useMutation({
    mutationFn: () =>
      platformSettingsApi.update({
        settings: flatSettings.map((s: any) => ({
          key: s.key,
          value: String(s.value),
        })),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Saved", description: res.data.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Save failed",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6">Loading platform settings...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">
            Global SaaS operator configuration
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Support contact, trial defaults, and feature flags
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {flatSettings.map((setting: any) => (
              <div key={setting.key} className="space-y-2">
                <Label>{setting.key.replace(/_/g, " ")}</Label>
                {setting.type === "boolean" ? (
                  <Switch
                    checked={setting.value === "true"}
                    onCheckedChange={(checked) =>
                      setValues((v) => ({
                        ...v,
                        [setting.key]: checked ? "true" : "false",
                      }))
                    }
                  />
                ) : (
                  <Input
                    value={setting.value}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        [setting.key]: e.target.value,
                      }))
                    }
                  />
                )}
                {setting.description && (
                  <p className="text-xs text-muted-foreground">
                    {setting.description}
                  </p>
                )}
              </div>
            ))}
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
