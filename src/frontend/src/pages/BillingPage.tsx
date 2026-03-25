import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilling } from "@/hooks/useBilling";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Crown,
  FileText,
  Loader2,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { type Variants, motion } from "motion/react";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } as never },
};

const itemVar: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export function BillingPage() {
  const {
    fillCount,
    paygPurchases,
    isProUser,
    isStripeConfigured,
    isLoading,
    isStartingCheckout,
    startProCheckout,
    startPaygCheckout,
  } = useBilling();

  const quotaPercent = isProUser ? 100 : Math.min(100, (fillCount / 2) * 100);
  const quotaAtLimit = !isProUser && fillCount >= 2;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <CreditCard
              size={20}
              className="text-amber-600 dark:text-amber-400"
            />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Billing &amp; Subscription
            </h1>
            <p className="text-muted-foreground text-sm">
              Manage your plan, payment methods, and usage
            </p>
          </div>
        </div>
      </motion.div>

      {!isStripeConfigured && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border text-muted-foreground text-sm"
          data-ocid="billing.stripe_notice.card"
        >
          <AlertCircle size={16} className="flex-shrink-0" />
          Payment processing is being configured. Check back soon.
        </motion.div>
      )}

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6"
      >
        {/* Current Plan Card */}
        <motion.div variants={itemVar}>
          <Card className="bento-card" data-ocid="billing.plan_card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-primary" />
                  </div>
                  Current Plan
                </CardTitle>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 rounded-full" />
                ) : isProUser ? (
                  <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1">
                    <Crown size={11} />
                    Pro
                  </Badge>
                ) : (
                  <Badge variant="secondary">Basic (Free)</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3" data-ocid="billing.loading_state">
                  <Skeleton className="h-3 w-full rounded-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">
                        Document fills this month
                      </span>
                      <span className="font-semibold text-foreground">
                        {isProUser ? (
                          <span className="text-amber-600 dark:text-amber-400">
                            Unlimited
                          </span>
                        ) : (
                          <span
                            className={quotaAtLimit ? "text-destructive" : ""}
                          >
                            {fillCount} / 2 used
                          </span>
                        )}
                      </span>
                    </div>
                    {!isProUser && (
                      <Progress
                        value={quotaPercent}
                        className={`h-2 ${
                          quotaAtLimit
                            ? "[&>div]:bg-destructive"
                            : "[&>div]:bg-primary"
                        }`}
                      />
                    )}
                    {isProUser && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <Sparkles size={14} />
                        Unlimited fills — Pro plan active
                      </div>
                    )}
                  </div>

                  {isProUser ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { icon: Zap, label: "Unlimited fills" },
                        { icon: FileText, label: "5GB document storage" },
                        { icon: ShieldCheck, label: "Public Forms library" },
                      ].map((f) => (
                        <div
                          key={f.label}
                          className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20"
                        >
                          <f.icon
                            size={14}
                            className="text-amber-600 dark:text-amber-400 flex-shrink-0"
                          />
                          <span className="text-xs font-medium text-foreground">
                            {f.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Basic plan: 2 document fills per month, no storage, no
                      Public Forms search.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Plan Comparison */}
        <motion.div variants={itemVar}>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" />
            Choose Your Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic */}
            <Card
              className={`bento-card relative overflow-hidden ${
                !isProUser ? "ring-2 ring-primary/30" : ""
              }`}
            >
              {!isProUser && (
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="text-xs">
                    Current Plan
                  </Badge>
                </div>
              )}
              <CardContent className="pt-6 pb-6">
                <div className="mb-4">
                  <h3 className="font-display font-bold text-xl text-foreground">
                    Basic
                  </h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-foreground">
                      Free
                    </span>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {[
                    { text: "2 document fills / month", included: true },
                    { text: "PDF field detection", included: true },
                    { text: "Master Profile JSON", included: true },
                    { text: "5GB secure storage", included: false },
                    { text: "Public Forms library", included: false },
                    { text: "Unlimited fills", included: false },
                  ].map((f) => (
                    <li
                      key={f.text}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <CheckCircle2
                        size={14}
                        className={f.included ? "text-success" : "text-border"}
                      />
                      <span
                        className={
                          f.included
                            ? "text-foreground"
                            : "text-muted-foreground line-through"
                        }
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="bento-card relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-card">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
              {isProUser && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs gap-1">
                    <Crown size={10} />
                    Active
                  </Badge>
                </div>
              )}
              <CardContent className="pt-6 pb-6">
                <div className="mb-4">
                  <h3 className="font-display font-bold text-xl text-foreground">
                    Pro
                  </h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-foreground">
                      $14.99
                    </span>
                    <span className="text-muted-foreground text-sm">
                      /month
                    </span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-5">
                  {[
                    "Unlimited document fills",
                    "5GB secure document storage",
                    "Public Forms library access",
                    "Priority processing",
                    "PDF field detection",
                    "Master Profile JSON",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle2
                        size={14}
                        className="text-amber-500 flex-shrink-0"
                      />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                {!isProUser && (
                  <Button
                    data-ocid="billing.upgrade_button"
                    className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white border-0"
                    onClick={startProCheckout}
                    disabled={isStartingCheckout || !isStripeConfigured}
                  >
                    {isStartingCheckout ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Crown size={15} />
                    )}
                    {isStartingCheckout ? "Redirecting..." : "Upgrade to Pro"}
                  </Button>
                )}
                {isProUser && (
                  <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
                    <CheckCircle2 size={15} />
                    You&apos;re on the Pro plan
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Pay-As-You-Go */}
        {!isProUser && (
          <motion.div variants={itemVar}>
            <Card className="bento-card border-primary/20">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Zap size={18} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Pay-As-You-Go
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Need just one fill? Unlock a single PDF download for
                        $1.99.
                      </p>
                    </div>
                  </div>
                  <Button
                    data-ocid="billing.payg_button"
                    variant="outline"
                    className="gap-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground whitespace-nowrap"
                    onClick={startPaygCheckout}
                    disabled={isStartingCheckout || !isStripeConfigured}
                  >
                    {isStartingCheckout ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CreditCard size={15} />
                    )}
                    Buy Single Fill ($1.99)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Transaction History */}
        <motion.div variants={itemVar}>
          <Card className="bento-card" data-ocid="billing.history_table">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-chart-2/15 flex items-center justify-center">
                  <Receipt size={16} className="text-chart-2" />
                </div>
                Transaction History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div
                  className="space-y-3"
                  data-ocid="billing.history.loading_state"
                >
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Plan row */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ShieldCheck size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {isProUser ? "Pro Subscription" : "Basic Plan"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isProUser ? "$14.99/month" : "Free"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        isProUser
                          ? "bg-amber-500 hover:bg-amber-500 text-white gap-1"
                          : ""
                      }
                      variant={isProUser ? "default" : "secondary"}
                    >
                      {isProUser ? (
                        <>
                          <Crown size={10} /> Active
                        </>
                      ) : (
                        "Active"
                      )}
                    </Badge>
                  </div>

                  {paygPurchases > 0 && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-chart-1/15 flex items-center justify-center">
                            <Zap size={14} className="text-chart-1" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Pay-As-You-Go Purchases
                            </p>
                            <p className="text-xs text-muted-foreground">
                              This billing period
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          {paygPurchases} × $1.99
                        </span>
                      </div>
                    </>
                  )}

                  {paygPurchases === 0 && !isProUser && (
                    <div
                      className="text-center py-6 text-muted-foreground text-sm"
                      data-ocid="billing.history.empty_state"
                    >
                      No transactions yet.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
