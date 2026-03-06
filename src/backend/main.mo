import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";

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

  type UserProfileInternal = {
    id : Text;
    name : Text;
    email : Text;
    fileReference : ?FileReference;
  };

  let fileReferences = Map.empty<Text, FileReference>();
  let userProfiles = Map.empty<Principal, UserProfileInternal>();

  public query ({ caller }) func getFileReference(id : Text) : async FileReference {
    switch (fileReferences.get(id)) {
      case (null) { Runtime.trap("FileReference does not exist") };
      case (?fileReference) { fileReference };
    };
  };

  public shared ({ caller }) func saveFileReference(fileReference : FileReference) : async () {
    fileReferences.add(fileReference.id, fileReference);
  };

  public shared ({ caller }) func deleteFileReference(id : Text) : async () {
    fileReferences.remove(id);
  };

  public query ({ caller }) func getCallerUserProfile() : async UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can get their profile");
    };

    let userId = caller.toText();
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("UserProfile with id " # userId # " does not exist") };
      case (?profile) {
        {
          id = userId;
          name = profile.name;
          email = profile.email;
        };
      };
    };
  };

  public query ({ caller }) func getUserProfile(caller : Principal) : async UserProfile {
    let userId = caller.toText();
    switch (userProfiles.get(caller)) {
      case (null) { Runtime.trap("UserProfile with id " # userId # " does not exist") };
      case (?profile) {
        {
          id = userId;
          name = profile.name;
          email = profile.email;
        };
      };
    };
  };

  public query ({ caller }) func getUserProfileFileReference(user : Principal) : async FileReference {
    switch (userProfiles.get(user)) {
      case (null) { Runtime.trap("UserProfile does not exist : " # user.toText()) };
      case (?userProfile) {
        switch (userProfile.fileReference) {
          case (null) {
            Runtime.trap("UserProfile does not have a fileReference");
          };
          case (?fileReference) { fileReference };
        };
      };
    };
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    assert (AccessControl.hasPermission(accessControlState, caller, #user));
    let id = caller.toText();
    userProfiles.add(
      caller,
      {
        id;
        name = profile.name;
        email = profile.email;
        fileReference = null;
      },
    );
  };

  public shared ({ caller }) func updateCallerProfileFileReference(fileName : Text, blob : Storage.ExternalBlob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save file references");
    };

    let id = caller.toText();
    let fileReferenceName = id # ":" # fileName;

    let fileReference = {
      id = fileReferenceName;
      blob;
      name = fileName;
    };

    fileReferences.add(fileReferenceName, fileReference);

    switch (userProfiles.get(caller)) {
      case (null) {
        Runtime.trap("UserProfile with id " # id # " should exist");
      };
      case (?userProfile) {
        userProfiles.add(
          caller,
          {
            id;
            name = userProfile.name;
            email = userProfile.email;
            fileReference = ?fileReference;
          },
        );
      };
    };
  };
};
