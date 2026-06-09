import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { platformUsersApi } from "@/lib/api";

export default function PlatformUsersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ["platform-users"],
    queryFn: () => platformUsersApi.list().then((r) => r.data.data),
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "SUPPORT_STAFF",
  });

  const createUser = useMutation({
    mutationFn: () => platformUsersApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-users"] });
      setForm({ name: "", email: "", password: "", role: "SUPPORT_STAFF" });
      toast({ title: "Platform user created" });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.response?.data?.message || "Create failed",
        variant: "destructive",
      });
    },
  });

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold">Platform Users</h1>

        <Card>
          <CardHeader>
            <CardTitle>Create staff account</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(role) => setForm({ ...form, role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLATFORM_ADMIN">Platform Admin</SelectItem>
                  <SelectItem value="BILLING_MANAGER">Billing Manager</SelectItem>
                  <SelectItem value="SUPPORT_STAFF">Support Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="md:col-span-2"
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending}
            >
              Create user
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading...</p>
            ) : (
              <div className="space-y-2">
                {(users || []).map((u: any) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between border-b py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="text-right">
                      <p>{u.role}</p>
                      <p className="text-muted-foreground">
                        {u.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
