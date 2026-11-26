# BGla Mac — Firestore Security Specification (Phase 0)

## 1. Data Invariants

1. **Identity Integrity**: Every user-owned document (`users/{userId}`, `users/{userId}/private/info`, `videoJobs/{jobId}`, `tickets/{ticketId}`) MUST bind `uid` / `ownerId` to `request.auth.uid` on creation and preserve ownership immutably across updates.
2. **Role Escalation Prevention**: Self-registered users in `users/{userId}` MUST initialize `role == 'fan'` and cannot modify `role` on update. Admin privileges require either verified bootstrap email (`marakaoude@gmail.com` with `email_verified == true`) or membership in `admins/{uid}`.
3. **PII Isolation**: Sensitive fields (`email`, `phone`) are strictly isolated inside `users/{userId}/private/info` and accessible only to the document owner or verified admin. Public `users/{userId}` documents never contain email or phone numbers.
4. **Terminal State Locking**:
   - `videoJobs/{jobId}` once `status` reaches `'completed'` or `'failed'` cannot be altered by non-admins.
   - `tickets/{ticketId}` must start with `status == 'valid'`; once `status` reaches `'used'` or `'cancelled'`, non-admins cannot revert or modify it. Only verified admins (gate scanners) can mark a ticket `'used'`.
5. **Temporal Integrity & Path Hardening**: All document IDs (`userId`, `docId`, `jobId`, `ticketId`) must match `^[a-zA-Z0-9_\-]+$` (max 128 chars). `createdAt` and `updatedAt` must equal `request.time` on creation, `createdAt` is immutable, and `updatedAt` must equal `request.time` on update.
6. **Bounded Fields & No Shadow Keys**: Every string field has strict `.size()` bounds; `visualEffects` list is bounded (`<= 6` items); `keys().hasAll(...)` and `keys().hasOnly(...)` reject unknown/ghost fields on create, and `affectedKeys().hasOnly(...)` restricts update mutations.

## 2. The "Dirty Dozen" Attack Payloads

1. **Identity Spoofing on VideoJob**: Authenticated user A creates `/videoJobs/job_1` with `ownerId: "user_B"`. -> `PERMISSION_DENIED`.
2. **Self-Assigned Admin Role**: User A creates `/users/user_A` with `role: "admin"`. -> `PERMISSION_DENIED`.
3. **Shadow / Ghost Field Injection**: User A creates `/videoJobs/job_2` with extra field `isFeatured: true`. -> `PERMISSION_DENIED`.
4. **Unverified Email Write**: User A with `email_verified: false` attempts to create `/tickets/tkt_1`. -> `PERMISSION_DENIED`.
5. **Email Spoofing Admin Bypass**: Attacker sets email to `marakaoude@gmail.com` with `email_verified: false` to read `/users/victim/private/info`. -> `PERMISSION_DENIED`.
6. **PII Blanket Read**: User A attempts `get` on `/users/user_B/private/info`. -> `PERMISSION_DENIED`.
7. **Unscoped List Scraping**: User A queries `collection(db, 'videoJobs')` without filtering `where('ownerId', '==', uid)`. -> `PERMISSION_DENIED`.
8. **Ticket Status Shortcutting**: User A creates `/tickets/tkt_2` with `status: "used"` or updates their own `'cancelled'` ticket back to `'valid'`. -> `PERMISSION_DENIED`.
9. **Terminal State Tampering**: User A updates a `'completed'` `/videoJobs/job_3` prompt or videoUrl. -> `PERMISSION_DENIED`.
10. **ID Poisoning**: User A attempts to create `/videoJobs/` with a 1500-char or `/` containing ID. -> `PERMISSION_DENIED`.
11. **Client Timestamp Forgery**: User A creates `/tickets/tkt_3` with a backdated string/timestamp instead of server `request.time`. -> `PERMISSION_DENIED`.
12. **Array / Payload Exhaustion (Denial of Wallet)**: User A sends a `videoJobs` document with 50 `visualEffects` items or a 10,000-character `prompt`. -> `PERMISSION_DENIED`.
