import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSystemSettings } from "@/contexts/SettingsContext";

export const SETTING_GROUPS = [
  {
    id: "general",
    label: "General",
    icon: "⚙️",
    desc: "Platform settings",
  },
  {
    id: "billing",
    label: "Billing",
    icon: "💳",
    desc: "Trial & subscription defaults",
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
    desc: "Passwords, sessions",
  },
  {
    id: "email_smtp",
    label: "Email & SMTP",
    icon: "📧",
    desc: "SMTP server & email sender",
  },
  {
    id: "meetings",
    label: "Meetings",
    icon: "📅",
    desc: "Meeting reminders & scheduling",
  },
  {
    id: "backup",
    label: "Backup",
    icon: "💾",
    desc: "Scheduled backups",
  },
] as const;

export function useSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => api.get("/platform/settings").then((r) => r.data),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { refreshSettings } = useSystemSettings();

  return useMutation({
    mutationFn: (payload: { key: string; value: string }[] | FormData) => {
      if (payload instanceof FormData) {
        return api
          .put("/platform/settings", payload, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .then((r) => r.data);
      }
      return api.put("/platform/settings", { settings: payload }).then((r) => r.data);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
      if (refreshSettings) refreshSettings();
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
  const { refreshSettings } = useSystemSettings();

  return useMutation({
    mutationFn: (group: string) =>
      api.post(`/platform/settings/reset/${group}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["platform-settings"] });
      if (refreshSettings) refreshSettings();
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

export function useTestEmail() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (to: string) =>
      api.post("/platform/settings/test-email", { to }).then((r) => r.data),
    onSuccess: (res) => {
      toast({ title: "Success", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "SMTP Test Failed",
        description:
          err?.response?.data?.message || "Failed to send test email.",
        variant: "destructive",
      });
    },
  });
}
