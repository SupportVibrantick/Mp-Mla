import { MainLayout } from "../../components/layout/MainLayout";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Input } from "../../components/ui/input";
import {
  useAccountSubscription,
  useAccountInvoices,
  useAccountPlans,
  useRequestPlanUpgrade,
  usePaymentCheckout,
} from "../../hooks/useAccount";
import { getImageUrl } from "../../lib/utils";
import { useState } from "react";
import { 
  Check, 
  Mail, 
  Phone, 
  ArrowUpRight, 
  Clock, 
  FileText,
  CreditCard,
  Loader2,
  ShieldCheck
} from "lucide-react";

export default function BillingPage() {
  const { data: subscription, isLoading: subLoading } =
    useAccountSubscription();
  const { data: invoices, isLoading: invLoading } = useAccountInvoices();
  const { data: plansData, isLoading: plansLoading } = useAccountPlans();
  const upgradeRequest = useRequestPlanUpgrade();
  const { initiatePayment, isLoading: isCheckoutLoading } = usePaymentCheckout();
  const [selectedCycle, setSelectedCycle] = useState("MONTHLY");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [tenantNote, setTenantNote] = useState("");

  const plans = plansData?.plans || [];
  const currentPlanId = plansData?.currentPlanId || subscription?.plan?.id;
  const pendingRequest = plansData?.pendingRequest;

  const submitUpgradeRequest = (planId: string) => {
    upgradeRequest.mutate({
      requestedPlanId: planId,
      requestedBillingCycle: selectedCycle,
      requesterPhone: requesterPhone || undefined,
      tenantNote: tenantNote || undefined,
    });
  };

  const handlePayAmountDue = () => {
    initiatePayment({
      notes: `Payment for outstanding amount due (INR ${subscription?.amountDue})`,
    });
  };

  const handlePayAndUpgrade = (planId: string) => {
    initiatePayment({
      planId,
      billingCycle: selectedCycle,
      notes: `Instant upgrade payment for plan ${planId}`,
    });
  };

  return (
    <MainLayout>
      <div className="space-y-12 max-w-6xl mx-auto p-4 md:p-8">
        {/* Header Section */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary uppercase tracking-wider">
              Administration
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">Billing & Subscription</h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1">
            Manage your constituency organization plans, resource limits, and payment history.
          </p>
        </div>

        {/* Subscription Info Asymmetrical Grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          {/* Left Side: Current Subscription (8 cols) */}
          <div className="lg:col-span-8 bg-card rounded-2xl p-6 md:p-8 border border-border/50 shadow-sm relative overflow-hidden group flex flex-col justify-between min-h-[250px]">
            {/* Subtle gradient blob for background visual interest */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
            
            <div className="relative z-10 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Subscription</span>
                  {subscription && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${
                      subscription.status?.toLowerCase() === 'active' 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400' 
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400'
                    }`}>
                      {subscription.status}
                    </span>
                  )}
                </div>
                
                {subLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-2/3" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                ) : subscription ? (
                  <div>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-4">
                      {subscription.plan?.name || "No Active Plan"}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-xl mb-6 leading-relaxed">
                      Your organization is subscribed to the {subscription.plan?.name} package. It provides active limits and support tailored for your constituency management operations.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No subscription data available.</p>
                )}
              </div>

              {subscription && !subLoading && (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-sm mt-auto pt-4 border-t border-border/50">
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Billing Cycle</span>
                    <span className="font-semibold text-foreground">{subscription.billingCycle || "N/A"}</span>
                  </div>
                  {subscription.trialEndsAt && (
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Trial Status</span>
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Ends {new Date(subscription.trialEndsAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  )}
                  {subscription.supportEmail && (
                    <div className="md:ml-auto">
                      <a 
                        href={`mailto:${subscription.supportEmail}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-semibold text-xs uppercase tracking-wider"
                      >
                        <Mail className="w-4 h-4" />
                        Support Contact
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Financial Summary (4 cols) */}
          <div className="lg:col-span-4 bg-muted/40 rounded-2xl p-6 md:p-8 border border-border/30 flex flex-col justify-between min-h-[250px]">
            {subLoading ? (
              <div className="space-y-4 w-full">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : subscription ? (
              <>
                <div>
                  <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Next Payment Due</span>
                  {subscription.nextPaymentDue ? (
                    <p className="text-lg font-bold text-foreground">
                      {new Date(subscription.nextPaymentDue).toLocaleDateString("en-IN")}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-muted-foreground">No upcoming payment</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Automatic renewal invoice will be processed.</p>
                </div>

                <div className="mt-6 pt-6 border-t border-border/50">
                  <span className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">Amount Due</span>
                  <div className="text-3xl font-extrabold tracking-tight text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
                    INR {subscription.amountDue?.toFixed(2) ?? "0.00"}
                  </div>
                  {subscription.amountDue > 0 && (
                    <Button
                      onClick={handlePayAmountDue}
                      disabled={isCheckoutLoading}
                      className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md font-bold text-sm flex items-center justify-center gap-2"
                    >
                      {isCheckoutLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          Pay Now via Razorpay
                        </>
                      )}
                    </Button>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Secured 256-bit Razorpay Gateway</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-muted-foreground text-sm">No billing summaries available.</p>
              </div>
            )}
          </div>
        </div>



        {/* Pricing Comparison & Request Section */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/50">
            <div>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">Available Packages</h3>
              <p className="text-sm text-muted-foreground">Compare structures and request upgrades for your organization.</p>
            </div>
            
            <div className="inline-flex bg-muted p-1 rounded-full border border-border/30 self-end md:self-auto">
              <button 
                type="button"
                onClick={() => setSelectedCycle("MONTHLY")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                  selectedCycle === "MONTHLY" 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button 
                type="button"
                onClick={() => setSelectedCycle("YEARLY")}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1 ${
                  selectedCycle === "YEARLY" 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Yearly
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">-20%</span>
              </button>
            </div>
          </div>

          {pendingRequest && (
            <div className="rounded-xl border border-amber-200/50 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-3">
              <Clock className="w-5 h-5 flex-shrink-0 text-amber-500 animate-pulse" />
              <div>
                <span className="font-semibold">Upgrade Request Pending:</span> {" "}
                Requested plan <span className="font-bold text-foreground">{pendingRequest.requestedPlan?.name}</span> ({pendingRequest.requestedBillingCycle || "Monthly"}). Submitted on {new Date(pendingRequest.createdAt).toLocaleDateString("en-IN")}.
              </div>
            </div>
          )}

          {plansLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-[380px] w-full" />
              <Skeleton className="h-[380px] w-full" />
              <Skeleton className="h-[380px] w-full" />
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-3 items-stretch">
              {plans.map((plan: any) => {
                const isCurrent = plan.id === currentPlanId;
                const isPending = pendingRequest?.requestedPlan?.id === plan.id;
                const price = selectedCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
                const displayPrice = Number(price || 0).toFixed(0);

                return (
                  <div 
                    key={plan.id} 
                    className={`bg-card rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 relative border ${
                      isCurrent 
                        ? "border-primary ring-2 ring-primary/20 shadow-md transform -translate-y-1 md:-translate-y-2 z-10" 
                        : "border-border/50 hover:border-border hover:shadow-sm"
                    }`}
                  >
                    {/* Top Indicator Badge */}
                    {isCurrent && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full shadow-sm">
                        Current Plan
                      </span>
                    )}
                    {!isCurrent && plan.isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full shadow-sm">
                        Popular Choice
                      </span>
                    )}

                    <div className="flex-1 mt-2">
                      <h4 className="text-xl font-bold text-foreground mb-1">{plan.name}</h4>
                      <p className="text-xs text-muted-foreground mb-6 min-h-[32px] line-clamp-2">{plan.description}</p>
                      
                      <div className="mb-6 pb-6 border-b border-border/50">
                        <span className="text-4xl font-extrabold tracking-tight text-foreground">INR {displayPrice}</span>
                        <span className="text-xs text-muted-foreground ml-1">/{selectedCycle === "YEARLY" ? "year" : "month"}</span>
                      </div>
                      
                      <ul className="space-y-3 mb-8 text-sm">
                        {Array.isArray(plan.features) && plan.features.map((feat: string, idx: number) => (
                          <li key={idx} className="flex items-center gap-2.5 text-muted-foreground">
                            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="line-clamp-1">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="space-y-2 mt-auto">
                      {!isCurrent && (
                        <Button
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5"
                          disabled={isCheckoutLoading}
                          onClick={() => handlePayAndUpgrade(plan.id)}
                        >
                          <CreditCard className="w-4 h-4" />
                          Pay & Upgrade Now
                        </Button>
                      )}
                      <Button
                        className="w-full"
                        variant={isCurrent ? "outline" : "secondary"}
                        disabled={isCurrent || !!pendingRequest || upgradeRequest.isPending}
                        onClick={() => {
                          setSelectedPlanId(plan.id);
                          submitUpgradeRequest(plan.id);
                        }}
                      >
                        {isCurrent
                          ? "Current Subscription"
                          : isPending
                            ? "Request Pending"
                            : selectedPlanId === plan.id && upgradeRequest.isPending
                              ? "Submitting..."
                              : "Request Approval"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upgrade Request Parameters Form */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-5 md:p-6">
            <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              Request Upgrade Parameters
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              Provide your contact number and notes below. These details are submitted automatically when you click the "Request Approval" button on any package.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Contact Phone</label>
                <Input
                  value={requesterPhone}
                  onChange={(event) => setRequesterPhone(event.target.value)}
                  placeholder="Enter billing contact phone number"
                  className="bg-card border-border/60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Optional Upgrade Note</label>
                <Textarea
                  value={tenantNote}
                  onChange={(event) => setTenantNote(event.target.value)}
                  placeholder="Any details or customization needs for the upgrade..."
                  className="bg-card border-border/60 md:min-h-10 resize-none text-sm"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice History Section */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border/50">
            <h3 className="text-xl font-bold tracking-tight text-foreground">Recent Invoices</h3>
            <p className="text-sm text-muted-foreground">Review your past billing cycle payments and download invoices.</p>
          </div>
          
          <div className="p-2">
            {invLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : !invoices?.length ? (
              <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
                <FileText className="w-8 h-8 text-muted-foreground/50" />
                <span>No invoices found for this account yet.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground font-semibold">
                      <th className="px-4 py-4 font-medium uppercase tracking-wider text-[11px]">Invoice #</th>
                      <th className="px-4 py-4 font-medium uppercase tracking-wider text-[11px]">Date</th>
                      <th className="px-4 py-4 font-medium uppercase tracking-wider text-[11px]">Amount</th>
                      <th className="px-4 py-4 font-medium uppercase tracking-wider text-[11px]">Method / Gateway</th>
                      <th className="px-4 py-4 font-medium uppercase tracking-wider text-[11px]">Status</th>
                      <th className="px-4 py-4 font-medium uppercase tracking-wider text-[11px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {invoices.map((inv: any) => {
                      const status = inv.status?.toLowerCase();
                      const isPaid = status === 'paid' || status === 'completed' || status === 'success';
                      const isPending = status === 'pending' || status === 'created';
                      
                      return (
                        <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-4 font-semibold text-foreground">
                            {inv.invoiceNumber || `#${inv.id.slice(0, 8)}`}
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {new Date(inv.paidAt || inv.createdAt).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-4 py-4 font-semibold text-foreground">
                            {inv.currency} {inv.amount?.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{inv.method || "ONLINE"}</span>
                            {inv.gateway && <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{inv.gateway}</span>}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              isPaid 
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : isPending
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400'
                                  : 'bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isPaid ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-red-500'
                              }`}></span>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right flex items-center justify-end gap-2">
                            {isPending && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700"
                                disabled={isCheckoutLoading}
                                onClick={() => initiatePayment({ paymentId: inv.id })}
                              >
                                <CreditCard className="w-3 h-3 mr-1" />
                                Pay
                              </Button>
                            )}
                            {inv.invoiceUrl ? (
                              <a
                                href={getImageUrl(inv.invoiceUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors font-semibold text-xs"
                              >
                                View
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-xs">No preview</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
