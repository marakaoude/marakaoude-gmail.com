/**
 * Security Rules Unit Test Suite (Phase 0 TDD)
 * Validates the Dirty Dozen attack payloads against firestore.rules.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'create' | 'update' | 'get' | 'list';
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on VideoJob',
    collectionPath: 'videoJobs/job_spoof',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      id: 'job_spoof',
      ownerId: 'victim_uid',
      operationName: 'op_1',
      status: 'completed',
      prompt: 'Concert',
      aspectRatio: '9:16',
      resolution: '720p',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Self-Assigned Admin Role on User Profile',
    collectionPath: 'users/attacker_uid',
    operation: 'create',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      uid: 'attacker_uid',
      displayName: 'Attacker',
      role: 'admin',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow / Ghost Field Injection',
    collectionPath: 'videoJobs/job_ghost',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      id: 'job_ghost',
      ownerId: 'user_1',
      operationName: 'op_2',
      status: 'completed',
      prompt: 'Concert',
      aspectRatio: '16:9',
      resolution: '1080p',
      isAdminVerified: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified Email Write',
    collectionPath: 'tickets/tkt_unverified',
    operation: 'create',
    auth: { uid: 'user_unverified', email: 'u@example.com', email_verified: false },
    payload: {
      id: 'tkt_unverified',
      ownerId: 'user_unverified',
      status: 'valid',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Email Spoofing Admin Bypass (email_verified=false)',
    collectionPath: 'users/victim_uid/private/info',
    operation: 'get',
    auth: { uid: 'spoof_uid', email: 'marakaoude@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'PII Blanket Read on Another User',
    collectionPath: 'users/victim_uid/private/info',
    operation: 'get',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unscoped List Query on VideoJobs',
    collectionPath: 'videoJobs',
    operation: 'list',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Ticket Status Shortcutting to Used by Non-Admin',
    collectionPath: 'tickets/tkt_used_forge',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      id: 'tkt_used_forge',
      ownerId: 'user_1',
      status: 'used',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Tampering on Completed VideoJob',
    collectionPath: 'videoJobs/job_completed',
    operation: 'update',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      prompt: 'Tampered prompt',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning (>128 chars)',
    collectionPath: `videoJobs/${'a'.repeat(250)}`,
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Client Timestamp Forgery',
    collectionPath: 'videoJobs/job_time',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      id: 'job_time',
      ownerId: 'user_1',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Array / Prompt Exhaustion Attack',
    collectionPath: 'videoJobs/job_dos',
    operation: 'create',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      id: 'job_dos',
      ownerId: 'user_1',
      prompt: 'x'.repeat(10000),
      visualEffects: Array.from({ length: 20 }, (_, i) => `fx_${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
];
