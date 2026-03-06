import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface FileReference {
    id: string;
    blob: ExternalBlob;
    name: string;
}
export interface UserProfile {
    id: string;
    name: string;
    email: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteFileReference(id: string): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile>;
    getCallerUserRole(): Promise<UserRole>;
    getFileReference(id: string): Promise<FileReference>;
    getUserProfile(caller: Principal): Promise<UserProfile>;
    getUserProfileFileReference(user: Principal): Promise<FileReference>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveFileReference(fileReference: FileReference): Promise<void>;
    updateCallerProfileFileReference(fileName: string, blob: ExternalBlob): Promise<void>;
}
