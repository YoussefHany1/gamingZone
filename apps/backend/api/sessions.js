import { getAdmin } from './firebaseAdmin.js';
import { requireAuth } from './social.js';
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

export async function proposeSlot(uid, sessionId, input) {
  const startsAt = normalizeStartsAt(input?.startsAt);
  const durationMin = Number.isFinite(input?.durationMin) ? Math.max(15, Math.min(480, Math.floor(input.durationMin))) : 60;
  const validation = validateStartsAt(startsAt);
  if (validation) throw new SessionError(validation.replaceAll('_', ' '), 400, validation);
  const admin = await requireAdmin();
  const { FieldValue } = await loadFirestoreSdk();
  const db = admin.firestore;
  const proposalId = `${uid}_${Date.now()}`;
  await db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (!data.participantUids?.includes(uid)) throw new SessionError('Not a participant', 403, 'not_participant');
    if (data.status !== 'proposed') throw new SessionError('Session is no longer open', 409, 'session_closed');
    const proposals = activeProposals(data.proposals, Date.now());
    if (proposals.length >= MAX_PROPOSALS) throw new SessionError('Proposal limit reached', 409, 'proposal_limit');
    const responses = Object.fromEntries(data.participantUids.map((participant) => [participant, participant === uid ? 'accepted' : 'pending']));
    transaction.update(ref, {
      proposals: [...proposals, { id: proposalId, proposerUid: uid, startsAt, durationMin, responses, createdAt: FieldValue.serverTimestamp(), status: 'open' }],
    });
  });
  return { proposalId };
}

export async function respondToSlot(uid, sessionId, proposalId, response) {
  if (!['accepted', 'declined'].includes(response)) throw invalid();
  const admin = await requireAdmin();
  const db = admin.firestore;
  await db.runTransaction(async (transaction) => {
    const { ref, data } = await readSession(transaction, db, sessionId);
    if (!data.participantUids?.includes(uid)) throw new SessionError('Not a participant', 403, 'not_participant');
    if (data.status !== 'proposed') throw new SessionError('Session is no longer open', 409, 'session_closed');
    const proposals = (data.proposals ?? []).map((proposal) =>
      proposal.id === proposalId ? { ...proposal, responses: { ...proposal.responses, [uid]: response } } : proposal,
    );
    if (!proposals.some((proposal) => proposal.id === proposalId)) throw new SessionError('Proposal not found', 404, 'proposal_not_found');
    transaction.update(ref, { proposals });
  });
  return { responded: true };
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
    if (data.status !== 'proposed') throw new SessionError('Session is no longer open', 409, 'session_closed');
    const proposal = (data.proposals ?? []).find((item) => item.id === proposalId);
    if (!proposal) throw new SessionError('Proposal not found', 404, 'proposal_not_found');
    if (!allParticipantsAccepted(data.participantUids, proposal.responses)) {
      throw new SessionError('Everyone must accept the same slot', 409, 'not_agreed');
    }
    const messageRef = db.collection('conversations').doc(data.conversationId).collection('messages').doc();
    const now = FieldValue.serverTimestamp();
    transaction.update(ref, { status: 'confirmed', confirmedProposalId: proposalId, startsAt: proposal.startsAt, proposals: [proposal] });
    transaction.create(messageRef, { senderId: 'system', text: `${data.gameName} session confirmed`, type: 'system', createdAt: now, editedAt: null, deletedAt: null, deletedFor: [] });
    transaction.set(db.collection('conversations').doc(data.conversationId), { lastMessage: { senderId: 'system', text: `${data.gameName} session confirmed`, type: 'system', createdAt: now }, lastMessageAt: now }, { merge: true });
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
  post('/social/sessions/cancel', (req) => cancelSession(req.authUid, req.body?.sessionId));
  post('/social/sessions/leave', (req) => leaveSession(req.authUid, req.body?.sessionId));
}
