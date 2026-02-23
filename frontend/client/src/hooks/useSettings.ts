import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const SETTING_GROUPS = [
  {
    id: "general",
    label: "General",
    icon: "⚙️",
    desc: "Organization & locale",
  },
  {
    id: "branding",
    label: "Branding",
    icon: "🎨",
    desc: "Colors, logo & theme",
  },
  {
    id: "security",
    label: "Security",
    icon: "🔒",
    desc: "Passwords, sessions & 2FA",
  },
  {
    id: "grievance",
    label: "Grievance",
    icon: "📋",
    desc: "SLA, categories & rules",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "🔔",
    desc: "SMS, WhatsApp & email",
  },
  { id: "backup", label: "Backup", icon: "💾", desc: "Scheduled backups" },
] as const;

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/admin/settings").then((r) => r.data),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (settings: { key: string; value: string }[]) =>
      api.put("/admin/settings", { settings }).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Settings Saved", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Save failed",
        variant: "destructive",
      });
    },
  });
}

export function useResetSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (group: string) =>
      api.post(`/admin/settings/reset/${group}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Reset", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Reset failed",
        variant: "destructive",
      });
    },
  });
}
