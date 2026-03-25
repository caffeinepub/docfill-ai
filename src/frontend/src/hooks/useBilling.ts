import { SubscriptionTier } from "@/backend";
import { useActor } from "@/hooks/useActor";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function useBilling() {
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [paygVerified, setPaygVerified] = useState(false);

  const billingQuery = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerSubscription();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });

  const stripeConfigQuery = useQuery({
    queryKey: ["billing", "stripeConfigured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });

  const info = billingQuery.data;
  const tier = info?.tier ?? SubscriptionTier.basic;
  const fillCount = Number(info?.fillCount ?? 0n);
  const paygPurchases = Number(info?.paygPurchases ?? 0n);
  const isProUser = tier === SubscriptionTier.pro;
  const hasQuotaRemaining = isProUser || fillCount < 2;
  const isStripeConfigured = stripeConfigQuery.data ?? false;

  const startProCheckout = useCallback(async () => {
    if (!actor) return;
    setIsStartingCheckout(true);
    try {
      const url = await actor.createCheckoutSession(
        [
          {
            productName: "DocFill AI Pro",
            currency: "usd",
            quantity: 1n,
            priceInCents: 1499n,
            productDescription:
              "Unlimited document fills, 5GB storage, Public Forms library",
          },
        ],
        `${window.location.href}${window.location.search ? "&" : "?"}pro=true`,
        window.location.href,
      );
      window.location.href = url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setIsStartingCheckout(false);
    }
  }, [actor]);

  const startPaygCheckout = useCallback(async () => {
    if (!actor) return;
    setIsStartingCheckout(true);
    try {
      const url = await actor.createCheckoutSession(
        [
          {
            productName: "DocFill AI - Unlock & Download",
            currency: "usd",
            quantity: 1n,
            priceInCents: 199n,
            productDescription: "One-time PDF unlock and download",
          },
        ],
        `${window.location.href}${window.location.search ? "&" : "?"}payg=true`,
        window.location.href,
      );
      window.location.href = url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setIsStartingCheckout(false);
    }
  }, [actor]);

  const checkPaymentSuccess = useCallback(
    async (sessionId: string): Promise<boolean> => {
      if (!actor) return false;
      try {
        const status = await actor.getStripeSessionStatus(sessionId);
        if (status.__kind__ === "completed") {
          await actor.recordPaygPurchase(1n);
          queryClient.invalidateQueries({ queryKey: ["billing"] });
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [actor, queryClient],
  );

  // Auto-verify on page load from URL params
  useEffect(() => {
    if (!actor || isFetching) return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const isPayg = params.get("payg") === "true";
    const isPro = params.get("pro") === "true";

    if (!sessionId) return;

    // Clean URL params
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    if (isPayg) {
      checkPaymentSuccess(sessionId).then((ok) => {
        if (ok) {
          setPaygVerified(true);
          toast.success("Payment verified! Your document is unlocked.");
        } else {
          toast.error("Could not verify payment. Please try again.");
        }
      });
    } else if (isPro) {
      // For Pro, the webhook updates the subscription tier
      // We just refetch billing info
      queryClient.invalidateQueries({ queryKey: ["billing"] });
      toast.success("Pro subscription activated! Enjoy unlimited fills.");
    }
  }, [actor, isFetching, checkPaymentSuccess, queryClient]);

  return {
    tier,
    fillCount,
    paygPurchases,
    isProUser,
    hasQuotaRemaining,
    isStripeConfigured,
    isLoading: billingQuery.isLoading,
    isStartingCheckout,
    paygVerified,
    startProCheckout,
    startPaygCheckout,
    checkPaymentSuccess,
    refetch: () => queryClient.invalidateQueries({ queryKey: ["billing"] }),
  };
}
