import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Storage "blob-storage/Storage";
import Nat "mo:core/Nat";
import Int "mo:core/Int";

module {
  public type OldUserProfileInternal = {
    id : Text;
    name : Text;
    email : Text;
    fileReference : ?{
      id : Text;
      blob : Storage.ExternalBlob;
      name : Text;
    };
  };

  public type OldActor = {
    fileReferences : Map.Map<Text, {
      id : Text;
      blob : Storage.ExternalBlob;
      name : Text;
    }>;
    userProfiles : Map.Map<Principal, OldUserProfileInternal>;
  };

  public type NewUserProfile = {
    id : Text;
    name : Text;
    email : Text;
  };

  public type NewUserBillingInfo = {
    tier : { #basic; #pro };
    fillCount : Nat;
    lastResetTimestampNanos : Int;
    paygPurchases : Nat;
  };

  public type NewActor = {
    fileReferences : Map.Map<Text, {
      id : Text;
      blob : Storage.ExternalBlob;
      name : Text;
    }>;
    userProfiles : Map.Map<Principal, NewUserProfile>;
    userBilling : Map.Map<Principal, NewUserBillingInfo>;
  };

  public func run(old : OldActor) : NewActor {
    let userProfiles = old.userProfiles.map<Principal, OldUserProfileInternal, NewUserProfile>(
      func(_principal, oldProfile) {
        {
          id = oldProfile.id;
          name = oldProfile.name;
          email = oldProfile.email;
        };
      }
    );
    { fileReferences = old.fileReferences; userProfiles; userBilling = Map.empty<Principal, NewUserBillingInfo>() };
  };
};
