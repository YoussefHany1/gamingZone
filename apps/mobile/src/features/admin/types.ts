/**
 * Contracts for the admin dashboard API (`/admin/*`).
 *
 * Kept in sync with `apps/backend/api/admin.js`: every field here is either
 * computed server-side or explicitly whitelisted by `sanitizeUserRecord`.
 */

export type AdminRange = "7d" | "30d" | "90d";

export type AdminUserFilter = "all" | "admins" | "disabled";

export type AdminBreakdownRow = {
  value: string;
  count: number;
};

export type AdminSignupBucket = {
  date: string;
  count: number;
};

export type AdminUserRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  country: string | null;
  platform: string | null;
  gender: string | null;
  dob: string | null;
  isAdmin: boolean;
  disabled: boolean;
  createdAt: number | null;
  updatedAt: number | null;
  handle?: string | null;
  profileStatus?: string | null;
  lastSignIn?: string | null;
  createdAuthAt?: string | null;
  emailVerified?: boolean;
  providers?: string[];
  authExists?: boolean;
};

export type AdminOverview = {
  range: AdminRange;
  days: number;
  generatedAt: number;
  approximate: boolean;
  sampleSize: number;
  scanCap: number;
  cached: boolean;
  totals: {
    users: number;
    profiles: number;
    admins: number;
    conversations: number;
    messages: number;
    playSessions: number;
    friendships: number;
    blockedPairs: number;
    linkedAccounts: number;
    onlineNow: number;
  };
  signups: {
    inRange: number;
    approximate: boolean;
    series: AdminSignupBucket[];
  };
  distributions: {
    scope: "recent_signups";
    approximate: boolean;
    sampleSize: number;
    platforms: AdminBreakdownRow[];
    countries: AdminBreakdownRow[];
  };
  recentUsers: AdminUserRow[];
};

export type AdminUsersPage = {
  mode: string;
  filter: AdminUserFilter;
  limit: number;
  nextCursor: string | null;
  users: AdminUserRow[];
};

export type AdminAuditEntry = {
  id: string;
  actorUid: string | null;
  actorEmail: string | null;
  targetUid: string | null;
  targetEmail: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: number | null;
};

export type AdminUserDetail = {
  user: AdminUserRow & {
    handle: string | null;
    bio: string | null;
    bannerURL: string | null;
    profileStatus: string | null;
    profileCreatedAt: number | null;
  };
  auth: {
    exists: boolean;
    disabled?: boolean;
    emailVerified?: boolean;
    lastSignIn?: string | null;
    createdAuthAt?: string | null;
    providers?: string[];
    customClaims?: { admin: boolean };
  };
  linkedAccounts: Array<{
    platform: string;
    status: string | null;
    linkedAt: number | null;
    lastSyncedAt: number | null;
  }>;
  counts: {
    lists: number;
    ratings: number;
    friends: number;
    conversations: number;
    sessions: number;
  };
  recentAudit: AdminAuditEntry[];
};
