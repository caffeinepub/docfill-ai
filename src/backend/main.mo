import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Stripe "stripe/stripe";
import OutCall "http-outcalls/outcall";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";

import Iter "mo:core/Iter";
import Time "mo:core/Time";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);
  include MixinStorage();

  public type FileReference = {
    id : Text;
    blob : Storage.ExternalBlob;
    name : Text;
  };

  public type UserProfile = {
    id : Text;
    name : Text;
    email : Text;
  };

  public type SubscriptionTier = {
    #basic;
    #pro;
  };

  public type UserBillingInfo = {
    tier : SubscriptionTier;
    fillCount : Nat;
    lastResetTimestampNanos : Int;
    paygPurchases : Nat;
  };

  let fileReferences = Map.empty<Text, FileReference>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let userBilling = Map.empty<Principal, UserBillingInfo>();

  // Stripe
  var stripeConfig : ?Stripe.StripeConfiguration = null;

  // --- File Storage ---
  public query ({ caller }) func getFileReference(id : Text) : async FileReference {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access files");
    };
    switch (fileReferences.get(id)) {
      case (null) { Runtime.trap("FileReference does not exist") };
      case (?fileReference) { fileReference };
    };
  };

  public shared ({ caller }) func saveFileReference(fileReference : FileReference) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save files");
    };
    fileReferences.add(fileReference.id, fileReference);
  };

  public shared ({ caller }) func deleteFileReference(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete files");
    };
    fileReferences.remove(id);
  };

  // --- Profile Management ---
  public query ({ caller }) func getCallerUserProfile() : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their profile");
    };

    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("UserProfile does not exist") };
      case (?profile) { profile };
    };
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("UserProfile does not exist") };
      case (?profile) { profile };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // --- Billing & Subscription ---
  public query ({ caller }) func getCallerSubscription() : async UserBillingInfo {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access subscription info");
    };
    switch (userBilling.get(caller)) {
      case (null) { Runtime.trap("No billing info found for caller") };
      case (?billingInfo) { billingInfo };
    };
  };

  public shared ({ caller }) func recordDocumentFill() : async { #ok; #quota_exceeded } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record document fills");
    };
    let now = Time.now();
    let billing = switch (userBilling.get(caller)) {
      case (null) {
        // Default to basic tier if no info
        {
          tier = #basic;
          fillCount = 0;
          lastResetTimestampNanos = now;
          paygPurchases = 0;
        };
      };
      case (?info) { info };
    };

    // Reset monthly if needed
    let monthInNanos = 30 * 24 * 60 * 60 * 1_000_000_000;
    let resetBilling = if (now - billing.lastResetTimestampNanos > monthInNanos) {
      { billing with fillCount = 0; lastResetTimestampNanos = now };
    } else {
      billing;
    };

    switch (resetBilling.tier) {
      case (#basic) {
        if (resetBilling.fillCount < 2) {
          userBilling.add(caller, { resetBilling with fillCount = resetBilling.fillCount + 1 });
          #ok;
        } else {
          #quota_exceeded;
        };
      };
      case (#pro) {
        userBilling.add(caller, { resetBilling with fillCount = resetBilling.fillCount + 1 });
        #ok;
      };
    };
  };

  public shared ({ caller }) func recordPaygPurchase(quantity : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can record purchases");
    };
    if (quantity <= 0) {
      Runtime.trap("Purchase quantity must be higher than 0");
    };
    let billing = switch (userBilling.get(caller)) {
      case (null) {
        {
          tier = #basic;
          fillCount = 0;
          lastResetTimestampNanos = Time.now();
          paygPurchases = quantity;
        };
      };
      case (?info) {
        { info with paygPurchases = info.paygPurchases + quantity };
      };
    };
    userBilling.add(caller, billing);
  };

  public query ({ caller }) func getCallerFillUsage() : async UserBillingInfo {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access fill usage");
    };
    switch (userBilling.get(caller)) {
      case (null) { Runtime.trap("No billing info found for caller") };
      case (?billingInfo) { billingInfo };
    };
  };

  public shared ({ caller }) func updateSubscriptionTier(tier : SubscriptionTier) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update subscription tier");
    };
    switch (userBilling.get(caller)) {
      case (null) {
        userBilling.add(
          caller,
          {
            tier;
            fillCount = 0;
            lastResetTimestampNanos = Time.now();
            paygPurchases = 0;
          },
        );
      };
      case (?billing) {
        userBilling.add(
          caller,
          { billing with tier },
        );
      };
    };
  };

  // --- Stripe Integration ---

  public query ({ caller }) func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can set Stripe configuration");
    };
    stripeConfig := ?config;
  };

  func getStripeConfiguration() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case (null) { Runtime.trap("Stripe not configured") };
      case (?config) { config };
    };
  };

  public query ({ caller }) func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    await Stripe.createCheckoutSession(getStripeConfiguration(), caller, items, successUrl, cancelUrl, transform);
  };

  public func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    await Stripe.getSessionStatus(getStripeConfiguration(), sessionId, transform);
  };

  // --- Stripe Webhooks ---
  public shared ({ caller }) func handleStripeWebhook(event : Text, principalText : Text, newTier : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can handle webhooks");
    };
    let principal = Principal.fromText(principalText);
    if (event == "payment_success") {
      let tier = if (newTier == "pro") { #pro } else { #basic };
      userBilling.add(principal, {
        tier;
        fillCount = 0;
        lastResetTimestampNanos = Time.now();
        paygPurchases = 0;
      });
    } else if (event == "subscription_cancel") {
      userBilling.add(
        principal,
        {
          tier = #basic;
          fillCount = 0;
          lastResetTimestampNanos = Time.now();
          paygPurchases = 0;
        },
      );
    };
  };
};
