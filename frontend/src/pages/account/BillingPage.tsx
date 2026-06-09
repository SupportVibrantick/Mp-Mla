import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccountSubscription,
  useAccountInvoices,
  useAccountUsage,
} from "@/hooks/useAccount";
import { getImageUrl } from "@/lib/utils";

export default function BillingPage() {
  const { data: subscription, isLoading: subLoading } =
    useAccountSubscription();
  const { data: invoices, isLoading: invLoading } = useAccountInvoices();
  const { data: usage, isLoading: usageLoading } = useAccountUsage();

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Billing & Account</h1>
          <p className="text-muted-foreground">
            View your plan, usage limits, and invoice history
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Current plan and renewal status</CardDescription>
            </CardHeader>
            <CardContent>
              {subLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : subscription ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{subscription.plan?.name}</span>
                    <Badge>{subscription.status}</Badge>
                  </div>
                  <p>Billing cycle: {subscription.billingCycle}</p>
                  {subscription.trialEndsAt && (
                    <p>
                      Trial ends:{" "}
                      {new Date(subscription.trialEndsAt).toLocaleDateString(
                        "en-IN",
                      )}
                    </p>
                  )}
                  {subscription.nextPaymentDue && (
                    <p>
                      Next due:{" "}
                      {new Date(subscription.nextPaymentDue).toLocaleDateString(
                        "en-IN",
                      )}
                    </p>
                  )}
                  <p className="font-semibold">
                    Amount due: INR {subscription.amountDue?.toFixed(2) ?? "0.00"}
                  </p>
                  <p className="text-muted-foreground pt-2">
                    To renew or upgrade, contact{" "}
                    {subscription.supportEmail || "platform support"}.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">No subscription data</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>Resource consumption vs plan limits</CardDescription>
            </CardHeader>
            <CardContent>
              {usageLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : usage ? (
                <div className="space-y-2 text-sm">
                  <p>
                    Users: {usage.users.used} / {usage.users.limit}
                  </p>
                  <p>
                    Wards: {usage.wards.used} / {usage.wards.limit}
                  </p>
                  <p>
                    Storage: {usage.storage.usedMB} MB / {usage.storage.limitMB}{" "}
                    MB
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>Payment and invoice history</CardDescription>
          </CardHeader>
          <CardContent>
            {invLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !invoices?.length ? (
              <p className="text-muted-foreground text-sm">No invoices yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4">Invoice</th>
                      <th className="py-2 pr-4">Amount</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv: any) => (
                      <tr key={inv.id} className="border-b">
                        <td className="py-2 pr-4">
                          {inv.invoiceNumber || inv.id.slice(0, 8)}
                          {inv.invoiceUrl && (
                            <a
                              href={getImageUrl(inv.invoiceUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 text-primary underline"
                            >
                              View
                            </a>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {inv.currency} {inv.amount?.toFixed(2)}
                        </td>
                        <td className="py-2 pr-4">{inv.status}</td>
                        <td className="py-2">
                          {new Date(
                            inv.paidAt || inv.createdAt,
                          ).toLocaleDateString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
