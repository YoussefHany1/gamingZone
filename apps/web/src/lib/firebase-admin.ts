import "server-only";

import {
  SignJWT,
  decodeProtectedHeader,
  importPKCS8,
  importX509,
  jwtVerify,
  type JWTPayload,
  type KeyLike,
} from "jose";

/**
 * Firebase Admin-compatible helpers implemented with Web Crypto + fetch.
 *
 * The official `firebase-admin` package is Node-only (gRPC, Node streams and
 * crypto) and cannot run in Cloudflare Workers. This module intentionally keeps
 * the tiny surface the web app actually uses:
 *
 *   - create / verify Firebase session cookies and ID tokens
 *   - read Firestore documents and run simple equality queries
 *
 * All credentials stay server-side; nothing here is imported by client code.
 */

interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  webApiKey: string;
}

function getConfig(): FirebaseConfig {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const webApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !clientEmail || !privateKey || !webApiKey) {
    throw new Error(
      "Firebase server credentials are missing. Set FIREBASE_CLIENT_EMAIL, " +
        "FIREBASE_PRIVATE_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID and " +
        "NEXT_PUBLIC_FIREBASE_API_KEY.",
    );
  }

  return { projectId, clientEmail, privateKey, webApiKey };
}

/* -------------------------------------------------------------------------- */
/* Service account OAuth tokens                                                */
/* -------------------------------------------------------------------------- */

let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let accessTokenPromise: Promise<string> | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  if (accessTokenPromise) return accessTokenPromise;

  accessTokenPromise = (async () => {
    const { clientEmail, privateKey } = getConfig();
    const now = Math.floor(Date.now() / 1000);
    const key = await importPKCS8(privateKey, "RS256");

    const assertion = await new SignJWT({
      scope: [
        "https://www.googleapis.com/auth/cloud-platform",
        "https://www.googleapis.com/auth/datastore",
        "https://www.googleapis.com/auth/identitytoolkit",
      ].join(" "),
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(clientEmail)
      .setSubject(clientEmail)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(key);

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Firebase service account token request failed (${response.status}): ${await response.text()}`,
      );
    }

    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) throw new Error("Firebase token response had no access_token");

    cachedAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + Math.max(60, Number(data.expires_in ?? 3600)) * 1000,
    };
    return data.access_token;
  })();

  try {
    return await accessTokenPromise;
  } finally {
    accessTokenPromise = null;
  }
}

/* -------------------------------------------------------------------------- */
/* Firebase Auth (session cookies + ID tokens)                                 */
/* -------------------------------------------------------------------------- */

type CertificateKind = "session" | "idToken";

interface DecodedFirebaseToken extends JWTPayload {
  uid: string;
  auth_time?: number;
}

const PUBLIC_KEY_URLS: Record<CertificateKind, string> = {
  session: "https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys",
  idToken: "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
};

const certificateCache = new Map<
  CertificateKind,
  { certificates: Record<string, string>; expiresAt: number }
>();
const publicKeyCache = new Map<string, KeyLike>();

function cacheLifetimeMs(response: Response): number {
  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = /max-age=(\d+)/.exec(cacheControl)?.[1];
  return Math.max(60, Number(maxAge ?? 3600)) * 1000;
}

async function getCertificates(kind: CertificateKind): Promise<Record<string, string>> {
  const cached = certificateCache.get(kind);
  if (cached && cached.expiresAt > Date.now()) return cached.certificates;

  const response = await fetch(PUBLIC_KEY_URLS[kind]);
  if (!response.ok) {
    throw new Error(`Could not load Firebase ${kind} certificates (${response.status})`);
  }

  const certificates = (await response.json()) as Record<string, string>;
  certificateCache.set(kind, {
    certificates,
    expiresAt: Date.now() + cacheLifetimeMs(response),
  });
  return certificates;
}

async function verifyFirebaseToken(
  token: string,
  kind: CertificateKind,
): Promise<DecodedFirebaseToken> {
  const { projectId } = getConfig();
  const header = decodeProtectedHeader(token);
  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("Invalid Firebase token header");
  }

  const certificates = await getCertificates(kind);
  const certificate = certificates[header.kid];
  if (!certificate) throw new Error(`Unknown Firebase token key: ${header.kid}`);

  const cacheKey = `${kind}:${header.kid}`;
  let key = publicKeyCache.get(cacheKey);
  if (!key) {
    key = await importX509(certificate, "RS256");
    publicKeyCache.set(cacheKey, key);
  }

  const issuer =
    kind === "session"
      ? `https://session.firebase.google.com/${projectId}`
      : `https://securetoken.google.com/${projectId}`;

  const { payload } = await jwtVerify(token, key, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer,
  });

  const uid = payload.sub;
  if (!uid) throw new Error("Firebase token has no subject");

  return { ...payload, uid };
}

async function assertNotRevoked(payload: DecodedFirebaseToken): Promise<void> {
  const { projectId, webApiKey } = getConfig();
  const accessToken = await getAccessToken();

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup?key=${encodeURIComponent(webApiKey)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ localIds: [payload.uid] }),
    },
  );

  if (!response.ok) {
    throw new Error(`Firebase account lookup failed (${response.status})`);
  }

  const data = (await response.json()) as {
    users?: Array<{ disabled?: boolean; validSince?: string | number }>;
  };
  const user = data.users?.[0];
  if (!user || user.disabled === true) throw new Error("Firebase session revoked");

  const validSince = Number(user.validSince ?? 0);
  const authTime = Number(payload.auth_time ?? 0);
  if (validSince > authTime) throw new Error("Firebase session revoked");
}

export interface AdminAuthLike {
  createSessionCookie(
    idToken: string,
    options: { expiresIn: number },
  ): Promise<string>;
  verifySessionCookie(
    sessionCookie: string,
    checkRevoked?: boolean,
  ): Promise<DecodedFirebaseToken>;
  verifyIdToken(idToken: string): Promise<DecodedFirebaseToken>;
}

const adminAuth: AdminAuthLike = {
  async createSessionCookie(idToken, { expiresIn }) {
    const { projectId, webApiKey } = getConfig();
    const accessToken = await getAccessToken();

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}:createSessionCookie?key=${encodeURIComponent(webApiKey)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          validDuration: String(Math.floor(expiresIn / 1000)),
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Could not create Firebase session cookie (${response.status})`);
    }

    const data = (await response.json()) as { sessionCookie?: string };
    if (!data.sessionCookie) throw new Error("Firebase returned an empty session cookie");
    return data.sessionCookie;
  },

  async verifySessionCookie(sessionCookie, checkRevoked = false) {
    const payload = await verifyFirebaseToken(sessionCookie, "session");
    if (checkRevoked) await assertNotRevoked(payload);
    return payload;
  },

  verifyIdToken(idToken) {
    return verifyFirebaseToken(idToken, "idToken");
  },
};

export function getAdminAuth(): AdminAuthLike {
  return adminAuth;
}

/* -------------------------------------------------------------------------- */
/* Firestore REST client                                                       */
/* -------------------------------------------------------------------------- */

type RestValue = Record<string, unknown>;

function decodeMap(fields: Record<string, RestValue> | undefined): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields ?? {})) {
    result[key] = decodeValue(value);
  }
  return result;
}

function decodeValue(value: RestValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) {
    const millis = Date.parse(String(value.timestampValue));
    return Number.isNaN(millis) ? String(value.timestampValue) : millis;
  }
  if ("mapValue" in value) {
    const mapValue = value.mapValue as { fields?: Record<string, RestValue> };
    return decodeMap(mapValue.fields);
  }
  if ("arrayValue" in value) {
    const arrayValue = value.arrayValue as { values?: RestValue[] };
    return (arrayValue.values ?? []).map(decodeValue);
  }
  if ("nullValue" in value) return null;
  if ("referenceValue" in value) {
    const reference = String(value.referenceValue);
    return reference.split("/documents/")[1] ?? reference;
  }
  if ("geoPointValue" in value) return value.geoPointValue;
  if ("bytesValue" in value) return value.bytesValue;
  return undefined;
}

function encodeValue(value: unknown): RestValue {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeValue) } };
  }
  return { stringValue: String(value) };
}

function encodeSegments(segments: string[]): string {
  return segments.map((segment) => encodeURIComponent(segment)).join("/");
}

function firestoreBase(): string {
  const { projectId } = getConfig();
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

async function firestoreFetch(
  path: string,
  init: RequestInit & { allowMissing?: boolean } = {},
): Promise<Response> {
  const { allowMissing, headers, ...rest } = init;
  const response = await fetch(`${firestoreBase()}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (allowMissing && response.status === 404) return response;
  if (!response.ok) {
    throw new Error(
      `Firestore request failed (${response.status}): ${await response.text()}`,
    );
  }
  return response;
}

interface FirestoreDocument {
  name?: string;
  fields?: Record<string, RestValue>;
}

class DocumentSnapshot {
  constructor(
    private readonly reference: DocumentReference,
    private readonly value?: Record<string, unknown>,
  ) {}

  get id(): string {
    return this.reference.segments[this.reference.segments.length - 1] ?? "";
  }

  get exists(): boolean {
    return this.value !== undefined;
  }

  get ref(): DocumentReference {
    return this.reference;
  }

  data(): Record<string, unknown> {
    // The Admin SDK returns an empty DocumentData for missing documents; keep
    // that shape so existing callers don't need optional chaining everywhere.
    return this.value ?? {};
  }
}

function snapshotFromDocument(document: FirestoreDocument): DocumentSnapshot {
  const path = (document.name ?? "").split("/documents/")[1] ?? "";
  const segments = path.split("/").filter(Boolean).map(decodeURIComponent);
  return new DocumentSnapshot(new DocumentReference(segments), decodeMap(document.fields));
}

class DocumentReference {
  constructor(readonly segments: string[]) {}

  collection(name: string): CollectionReference {
    return new CollectionReference([...this.segments, name]);
  }

  async get(): Promise<DocumentSnapshot> {
    const response = await firestoreFetch(`/${encodeSegments(this.segments)}`, {
      allowMissing: true,
    });
    if (response.status === 404) return new DocumentSnapshot(this, undefined);
    return snapshotFromDocument((await response.json()) as FirestoreDocument);
  }
}

const FILTER_OPERATORS: Record<string, string> = {
  "==": "EQUAL",
  "!=": "NOT_EQUAL",
  ">": "GREATER_THAN",
  ">=": "GREATER_THAN_OR_EQUAL",
  "<": "LESS_THAN",
  "<=": "LESS_THAN_OR_EQUAL",
  in: "IN",
  "array-contains": "ARRAY_CONTAINS",
};

class Query {
  constructor(
    private readonly segments: string[],
    private readonly filters: Array<{ field: string; operator: string; value: unknown }>,
    private readonly limitCount?: number,
  ) {}

  where(field: string, operator: string, value: unknown): Query {
    return new Query(this.segments, [...this.filters, { field, operator, value }], this.limitCount);
  }

  limit(count: number): Query {
    return new Query(this.segments, this.filters, count);
  }

  async get(): Promise<QuerySnapshot> {
    const collectionId = this.segments[this.segments.length - 1];
    const parentSegments = this.segments.slice(0, -1);
    const parent = parentSegments.length ? `/${encodeSegments(parentSegments)}` : "";

    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId }],
    };

    if (this.filters.length > 0) {
      structuredQuery.where = {
        fieldFilter: {
          field: { fieldPath: this.filters[0].field },
          op: FILTER_OPERATORS[this.filters[0].operator] ?? "EQUAL",
          value: encodeValue(this.filters[0].value),
        },
      };
    }

    if (this.limitCount !== undefined) structuredQuery.limit = this.limitCount;

    const response = await firestoreFetch(`${parent}:runQuery`, {
      method: "POST",
      body: JSON.stringify({ structuredQuery }),
    });

    const rows = (await response.json()) as Array<{ document?: FirestoreDocument }>;
    const docs = rows
      .filter((row) => row.document)
      .map((row) => snapshotFromDocument(row.document as FirestoreDocument));

    return { docs, empty: docs.length === 0 };
  }
}

interface QuerySnapshot {
  docs: DocumentSnapshot[];
  empty: boolean;
}

class CollectionReference {
  constructor(readonly segments: string[]) {}

  doc(id: string): DocumentReference {
    return new DocumentReference([...this.segments, id]);
  }

  where(field: string, operator: string, value: unknown): Query {
    return new Query(this.segments, [{ field, operator, value }]);
  }

  limit(count: number): Query {
    return new Query(this.segments, [], count);
  }

  get(): Promise<QuerySnapshot> {
    return new Query(this.segments, []).get();
  }
}

class FirestoreDb {
  collection(name: string): CollectionReference {
    return new CollectionReference([name]);
  }
}

const firestoreDb = new FirestoreDb();

export function getAdminDb(): FirestoreDb {
  return firestoreDb;
}
