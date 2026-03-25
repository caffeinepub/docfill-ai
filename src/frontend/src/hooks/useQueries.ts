import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileReference, UserProfile } from "../backend";
import { ExternalBlob } from "../backend";
import { useActor } from "./useActor";

// ──────────────────────────────────────────────────────────────
// User Profile
// ──────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<UserProfile>({
    queryKey: ["callerUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["callerUserProfile"] });
    },
  });
}

// ──────────────────────────────────────────────────────────────
// File References
// ──────────────────────────────────────────────────────────────

export function useGetFileReference(id: string | null) {
  const { actor, isFetching } = useActor();
  return useQuery<FileReference>({
    queryKey: ["fileReference", id],
    queryFn: async () => {
      if (!actor || !id) throw new Error("Actor or id not available");
      return actor.getFileReference(id);
    },
    enabled: !!actor && !isFetching && !!id,
  });
}

export function useSaveFileReference() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileReference: FileReference) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveFileReference(fileReference);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fileReference"] });
    },
  });
}

export function useDeleteFileReference() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteFileReference(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["fileReference"] });
    },
  });
}

export function useUploadCallerProfileFile() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      fileName,
      bytes,
    }: {
      fileName: string;
      bytes: Uint8Array<ArrayBuffer>;
    }) => {
      if (!actor) throw new Error("Actor not available");
      const blob = ExternalBlob.fromBytes(bytes);
      const fileReference: FileReference = {
        id: `profile-${Date.now()}`,
        blob,
        name: fileName,
      };
      return actor.saveFileReference(fileReference);
    },
  });
}
