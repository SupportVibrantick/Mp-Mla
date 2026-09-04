import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { useSystemSettings } from "@/contexts/SettingsContext";

export const SETTING_GROUPS = [
  {
    id: "general",
    label: "General",
    icon: "⚙️",
    desc: "Organization & locale",
  },
  // {
  //   id: "grievance",
  //   label: "Grievance",
  //   icon: "📋",
  //   desc: "SLA, categories & rules",
  // },
  {
    id: "notifications",
    label: "Notifications",
    icon: "🔔",
    desc: "SMS & WhatsApp alerts",
  },
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
  const { refreshSettings } = useSystemSettings();

  return useMutation({
    mutationFn: (payload: { key: string; value: string }[] | FormData) => {
      if (payload instanceof FormData) {
        return api
          .put("/admin/settings", payload, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .then((r) => r.data);
      }
      return api.put("/admin/settings", { settings: payload }).then((r) => r.data);
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      refreshSettings();
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
      api.post(`/admin/settings/reset/${group}`).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      refreshSettings();
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
      api.post("/admin/settings/test-email", { to }).then((r) => r.data),
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


export function useTestWhatsApp() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (to: string) =>
      api.post("/admin/settings/test-whatsapp", { to }).then((r) => r.data),
    onSuccess: (res) => {
      toast({ title: "Success", description: res.message });
    },
    onError: (err: any) => {
      toast({
        title: "WhatsApp Test Failed",
        description:
          err?.response?.data?.message || "Failed to send test WhatsApp message.",
        variant: "destructive",
      });
    },
  });
}
