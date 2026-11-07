import { getAdmin } from './firebaseAdmin.js';
import { requireAuth } from './social.js';
import { sendSessionRequestPush } from './push.js';
import {
  activeProposals,
  allParticipantsAccepted,
  MAX_PROPOSALS,
  normalizeStartsAt,
  validateStartsAt,
} from './sessionState.js';

class SessionError extends Error {
  constructor(message, status = 400, code = 'invalid_payload') {
    super(message);
    this.name = 'SessionError';
    this.status = status;
    this.code = code;
  }
}

function invalid(message = 'Invalid payload') {
  return new SessionError(message);
}

function isUid(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 128 && !value.includes('/');
}

// ─── Session links (party rooms) ─────────────────────────────────────────────
//
// Mirrors `validateSessionUrl` in mobile `sessionLink.ts` — https-only,
// whitespace-free, dotted host (also rejects `user@host` userinfo tricks),
// ≤2048 chars. `javascript:` / `intent:` / custom app schemes are rejected
// by construction, and the client re-validates again before `openURL`.

const SESSION_LINK_LIMIT = 5;
const SESSION_LINK_MAX_LENGTH = 2048;
const SESSION_LINK_KINDS = new Set(['voice', 'lobby', 'party']);

function normalizeSessionUrl(url) {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > SESSION_LINK_MAX_LENGTH || /\s/.test(trimmed)) return null;
  if (!/^https:\/\//i.test(trimmed)) return null;
  const host = trimmed.slice('https://'.length).split(/[/?#]/)[0] ?? '';
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+(?::\d{1,5})?$/i.test(host)) return null;
  return trimmed;
}

function generateLinkId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalizes a client's links array: invalid rows are dropped, capped at 5. */
function normalizeSessionLinks(input) {
  if (!Array.isArray(input)) return [];
  const links = [];
  for (const link of input) {
    if (!link || typeof link !== 'object') continue;
    const url = normalizeSessionUrl(link.url);
    if (!url) continue;
    // A missing kind means a generic party link; explicit unknown kinds are
    // ignored so a schema change cannot smuggle arbitrary strings per row.
    const kind = link.kind === undefined ? 'party' : SESSION_LINK_KINDS.has(link.kind) ? link.kind : null;
    if (!kind) continue;
    const label = typeof link.label === 'string' ? link.label.trim().slice(0, 40) || null : null;
    links.push({ id: generateLinkId(), label, url, kind });
  }
  return links.slice(0, SESSION_LINK_LIMIT);
}

let firestoreSdkPromise;
function loadFirestoreSdk() {
  firestoreSdkPromise ??= import('firebase-admin/firestore');
  return firestoreSdkPromise;
}

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new SessionError('Social services are not configured', 503, 'not_configured');
  return admin;
}

async function readSession(transaction, db, sessionId) {
  const ref = db.collection('playSessions').doc(sessionId);
  const snap = await transaction.get(ref);
  if (!snap.exists) throw new SessionError('Session not found', 404, 'session_not_found');
  return { ref, snap, data: snap.data() ?? {} };
}

export async function createPlaySession(uid, input) {
  const conversationId = typeof input?.conversationId === 'string' ? input.conversationId : '';
  const gameId = input?.gameId;
  const gameName = typeof input?.gameName === 'string' ? input.gameName.trim().slice(0, 200) : '';
  if (!isUid(uid) || !conversationId || conversationId.includes('/') || gameId == null || !gameName) throw invalid();

  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;
  const conversationRef = db.collection('conversations').doc(conversationId);
  const sessionRef = db.collection('playSessions').doc();
  const links = normalizeSessionLinks(input?.links);

  await db.runTransaction(async (transaction) => {
    const conversationSnap = await transaction.get(conversationRef);
    const data = conversationSnap.data() ?? {};
    if (!conversationSnap.exists || !Array.isArray(data.members) || !data.members.includes(uid)) {
      throw new SessionError('You are not a conversation member', 403, 'not_member');
    }
    const participants = [...data.members];
    transaction.create(sessionRef, {
      conversationId,
      participantUids: participants,
      gameId,
      gameName,
      links,
      proposals: [],
      confirmedProposalId: null,
      startsAt: null,
      status: 'proposed',
      remindersSent: {},
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { sessionId: sessionRef.id };
}

// NOTE: `FieldValue.serverTimestamp()` is invalid inside array elements, so
// proposal documents stamp `createdAt` as a plain ms epoch instead.
export async function proposeSlot(uid, sessionId, input) {
  const startsAt = normalizeStartsAt(input?.startsAt);
  const durationMin = Number.isFinite(input?.durationMin) ? Math.max(15, Math.min(480, Math.floor(input.durationMin))) : 60;
  const validation = validateStartsAt(startsAt);
  if (validation) throw new SessionError(validation.replaceAll('_', ' '), 400, validation);
  const admin = await requireAdmin();
  const db = admin.firestore;
  const proposalId = `${uid}_${Date.now()}`;
  let recipientUids = [];
  let conversationId = '';
  let gameName = '';
  await db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (!data.participantUids?.includes(uid)) throw new SessionError('Not a participant', 403, 'not_participant');
    if (data.status !== 'proposed') throw new SessionError('Session is no longer open', 409, 'session_closed');
    recipientUids = Array.isArray(data.participantUids) ? data.participantUids : [];
    conversationId = typeof data.conversationId === 'string' ? data.conversationId : '';
    gameName = typeof data.gameName === 'string' ? data.gameName : 'Game';
    const proposals = activeProposals(data.proposals, Date.now());
    if (proposals.length >= MAX_PROPOSALS) throw new SessionError('Proposal limit reached', 409, 'proposal_limit');
    const responses = Object.fromEntries(data.participantUids.map((participant) => [participant, participant === uid ? 'accepted' : 'pending']));
    transaction.update(ref, {
      proposals: [...proposals, { id: proposalId, proposerUid: uid, startsAt, durationMin, responses, createdAt: Date.now(), status: 'open' }],
    });
  });
  // Push is best-effort and deliberately happens after the durable proposal
  // write, so notification delivery can never make proposing a slot fail.
  void sendSessionRequestPush({
    fromUid: uid,
    toUids: recipientUids,
    gameName,
    startsAt,
    conversationId,
    sessionId,
  }).catch((error) => console.warn('[push] session request push failed:', error?.message ?? error));
  return { proposalId };
}

/**
 * The shared confirmation writes for a fully-accepted proposal. Must run
 * inside the same transaction that produced the acceptance so the doc can
 * never sit in an "everyone accepted but still open" limbo.
 */
function applyConfirmation(transaction, db, ref, data, proposal, FieldValue) {
  const messageRef = db.collection('conversations').doc(data.conversationId).collection('messages').doc();
  const now = FieldValue.serverTimestamp();
  transaction.update(ref, { status: 'confirmed', confirmedProposalId: proposal.id, startsAt: proposal.startsAt, proposals: [proposal] });
  transaction.create(messageRef, { senderId: 'system', text: `${data.gameName} session confirmed`, type: 'system', gameId: data.gameId, gameName: data.gameName, createdAt: now, editedAt: null, deletedAt: null, deletedFor: [] });
  transaction.set(db.collection('conversations').doc(data.conversationId), { lastMessage: { senderId: 'system', text: `${data.gameName} session confirmed`, type: 'system', gameId: data.gameId, gameName: data.gameName, createdAt: now }, lastMessageAt: now }, { merge: true });
}

export async function respondToSlot(uid, sessionId, proposalId, response) {
  if (!['accepted', 'declined'].includes(response)) throw invalid();
  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;
  let confirmed = false;
  await db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (!data.participantUids?.includes(uid)) throw new SessionError('Not a participant', 403, 'not_participant');
    if (data.status !== 'proposed') throw new SessionError('Session is no longer open', 409, 'session_closed');
    const proposals = (data.proposals ?? []).map((proposal) =>
      proposal.id === proposalId ? { ...proposal, responses: { ...proposal.responses, [uid]: response } } : proposal,
    );
    const proposal = proposals.find((item) => item.id === proposalId);
    if (!proposal) throw new SessionError('Proposal not found', 404, 'proposal_not_found');

    // Auto-confirm: acceptance is the last missing agreement — as soon as
    // every participant has accepted the same slot, the session is confirmed
    // (startsAt moves onto the doc) with no extra "confirm" tap needed.
    if (response === 'accepted' &&
        allParticipantsAccepted(data.participantUids, proposal.responses)) {
      applyConfirmation(transaction, db, ref, data, proposal, FieldValue);
      confirmed = true;
      return;
    }
    transaction.update(ref, { proposals });
  });
  return { responded: true, ...(confirmed ? { confirmed: true } : {}) };
}

export async function withdrawProposal(uid, sessionId, proposalId) {
  const admin = await requireAdmin();
  const db = admin.firestore;
  await db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (data.status !== 'proposed') throw new SessionError('Session is no longer open', 409, 'session_closed');
    const proposal = (data.proposals ?? []).find((item) => item.id === proposalId);
    if (!proposal) throw new SessionError('Proposal not found', 404, 'proposal_not_found');
    if (proposal.proposerUid !== uid) throw new SessionError('Only the proposer can withdraw it', 403, 'not_proposer');
    transaction.update(ref, { proposals: (data.proposals ?? []).filter((item) => item.id !== proposalId) });
  });
  return { withdrawn: true };
}

export async function confirmSession(uid, sessionId, proposalId) {
  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;
  await db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (!data.participantUids?.includes(uid)) throw new SessionError('Not a participant', 403, 'not_participant');
    // Newer clients never need this route (acceptance auto-confirms), but it
    // remains for clients that shipped before the auto-confirm behaviour.
    if (data.status !== 'proposed') throw new SessionError('Session is no longer open', 409, 'session_closed');
    const proposal = (data.proposals ?? []).find((item) => item.id === proposalId);
    if (!proposal) throw new SessionError('Proposal not found', 404, 'proposal_not_found');
    if (!allParticipantsAccepted(data.participantUids, proposal.responses)) {
      throw new SessionError('Everyone must accept the same slot', 409, 'not_agreed');
    }
    applyConfirmation(transaction, db, ref, data, proposal, FieldValue);
  });
  return { confirmed: true };
}

export async function cancelSession(uid, sessionId) {
  const admin = await requireAdmin();
  const db = admin.firestore;
  await db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (!data.participantUids?.includes(uid)) throw new SessionError('Not a participant', 403, 'not_participant');
    if (!['proposed', 'confirmed'].includes(data.status)) throw new SessionError('Session is already closed', 409, 'session_closed');
    transaction.update(ref, { status: 'cancelled' });
  });
  return { cancelled: true };
}

export async function leaveSession(uid, sessionId) {
  const admin = await requireAdmin();
  const db = admin.firestore;
  await db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (!data.participantUids?.includes(uid)) throw new SessionError('Not a participant', 403, 'not_participant');
    if (!['proposed', 'confirmed'].includes(data.status)) throw new SessionError('Session is already closed', 409, 'session_closed');
    const participantUids = data.participantUids.filter((participant) => participant !== uid);
    transaction.update(ref, { participantUids, status: participantUids.length < 2 ? 'cancelled' : data.status });
  });
  return { left: true };
}

/**
 * Adds or removes a party-room link on a session. Creator-only, matching the
 * single-admin feel of groups: nobody else edits another player's lobby list.
 * Returns the resulting links array so callers can reconcile their cache.
 */
export async function updateSessionLinks(uid, sessionId, input) {
  const action = input?.action;
  if (action !== 'add' && action !== 'remove') throw invalid();
  const admin = await requireAdmin();
  const db = admin.firestore;
  return db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (!data.participantUids?.includes(uid)) throw new SessionError('Not a participant', 403, 'not_participant');
    if (data.createdBy !== uid) throw new SessionError('Only the session creator can manage links', 403, 'not_creator');
    if (!['proposed', 'confirmed'].includes(data.status)) throw new SessionError('Session is closed', 409, 'session_closed');

    const links = Array.isArray(data.links) ? data.links.filter((link) => link && typeof link === 'object') : [];
    if (action === 'add') {
      const url = normalizeSessionUrl(input?.link?.url);
      if (!url) throw new SessionError('Links must be https:// URLs', 400, 'invalid_link');
      if (links.some((link) => link.url === url)) throw new SessionError('This link is already attached', 409, 'duplicate_link');
      if (links.length >= SESSION_LINK_LIMIT) throw new SessionError('Link limit reached', 409, 'link_limit');
      const kind = input?.link?.kind === undefined ? 'party' : SESSION_LINK_KINDS.has(input.link.kind) ? input.link.kind : null;
      if (!kind) throw invalid();
      const label = typeof input?.link?.label === 'string' ? input.link.label.trim().slice(0, 40) || null : null;
      links.push({ id: generateLinkId(), label, url, kind });
    } else if (typeof input?.link?.id !== 'string') {
      throw invalid();
    }

    const next = action === 'remove' ? links.filter((link) => link.id !== input.link.id) : links;
    transaction.update(ref, { links: next });
    return { links: next };
  });
}

export function registerSessionRoutes(app, { AppError, asyncRoute }) {
  const auth = requireAuth(AppError);
  const rethrow = (cause) => {
    if (!(cause instanceof SessionError)) return cause;
    const error = new AppError(cause.message, cause.status);
    error.code = cause.code;
    return error;
  };
  const post = (path, handler) => app.post(path, auth, asyncRoute(async (req, res) => {
    try {
      const result = await handler(req);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ ok: true, ...result });
    } catch (cause) {
      throw rethrow(cause);
    }
  }));
  post('/social/sessions', (req) => createPlaySession(req.authUid, req.body));
  post('/social/sessions/propose', (req) => proposeSlot(req.authUid, req.body?.sessionId, req.body));
  post('/social/sessions/respond', (req) => respondToSlot(req.authUid, req.body?.sessionId, req.body?.proposalId, req.body?.response));
  post('/social/sessions/withdraw', (req) => withdrawProposal(req.authUid, req.body?.sessionId, req.body?.proposalId));
  post('/social/sessions/confirm', (req) => confirmSession(req.authUid, req.body?.sessionId, req.body?.proposalId));
  post('/social/sessions/links', (req) => updateSessionLinks(req.authUid, req.body?.sessionId, req.body));
  post('/social/sessions/cancel', (req) => cancelSession(req.authUid, req.body?.sessionId));
  post('/social/sessions/leave', (req) => leaveSession(req.authUid, req.body?.sessionId));
}
