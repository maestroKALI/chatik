export interface LocalIdentity {
  deviceId: string;
  displayName: string;
  phone?: string;
  email?: string;
  userId?: string;
  publicKey?: string;
  sessionToken?: string;
}
