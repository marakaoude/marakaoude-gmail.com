import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { GenerationJob, PurchasedTicket, FanReview } from '../types';

const ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;

function toSafeId(raw: string, prefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
  if (cleaned && ID_PATTERN.test(cleaned)) return cleaned;
  return `${prefix}_${Date.now()}`;
}

function toTimestampMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }
  return Date.now();
}

export async function saveVideoJobToFirestore(
  uid: string,
  job: GenerationJob
): Promise<void> {
  if (!ID_PATTERN.test(uid) || uid.length > 128) return;
  const safeId = toSafeId(job.id, 'job');
  const path = `videoJobs/${safeId}`;

  const sanitizedEffects = Array.isArray(job.visualEffects)
    ? job.visualEffects
        .filter((fx): fx is string => typeof fx === 'string' && fx.trim().length > 0)
        .slice(0, 6)
        .map((fx) => fx.trim().slice(0, 80))
    : [];

  const payload: Record<string, unknown> = {
    id: safeId,
    ownerId: uid,
    operationName: (job.operationName || 'op_veo').slice(0, 256),
    status: job.status === 'failed' || job.status === 'starting' || job.status === 'rendering'
      ? job.status
      : 'completed',
    prompt: (job.prompt || 'Concert Oude Mill').slice(0, 4000),
    aspectRatio: job.aspectRatio === '16:9' ? '16:9' : '9:16',
    resolution: job.resolution === '1080p' ? '1080p' : '720p',
    visualEffects: sanitizedEffects,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (job.videoUrl && !job.videoUrl.startsWith('data:')) {
    payload.videoUrl = job.videoUrl.slice(0, 500);
  }
  if (job.musicGenre) {
    payload.musicGenre = job.musicGenre.slice(0, 100);
  }
  if (job.cameraMovement) {
    payload.cameraMovement = job.cameraMovement.slice(0, 100);
  }

  try {
    await setDoc(doc(db, 'videoJobs', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeUserVideoJobs(
  uid: string,
  onData: (jobs: GenerationJob[]) => void
): () => void {
  const path = 'videoJobs';
  const q = query(
    collection(db, path),
    where('ownerId', '==', uid),
    limit(24)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const jobs: GenerationJob[] = snapshot.docs
        .map((d): GenerationJob => {
          const data = d.data();
          return {
            id: String(data.id || d.id),
            operationName: String(data.operationName || ''),
            status: (data.status as GenerationJob['status']) || 'completed',
            prompt: String(data.prompt || ''),
            aspectRatio: (data.aspectRatio === '16:9' ? '16:9' : '9:16') as GenerationJob['aspectRatio'],
            resolution: (data.resolution === '1080p' ? '1080p' : '720p') as GenerationJob['resolution'],
            videoUrl: data.videoUrl ? String(data.videoUrl) : undefined,
            musicGenre: data.musicGenre ? String(data.musicGenre) : undefined,
            cameraMovement: data.cameraMovement ? String(data.cameraMovement) : undefined,
            visualEffects: Array.isArray(data.visualEffects) ? data.visualEffects : undefined,
            createdAt: toTimestampMs(data.createdAt),
            progressPercent: data.status === 'completed' ? 100 : 25,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      onData(jobs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function deleteVideoJobFromFirestore(jobId: string): Promise<void> {
  const safeId = toSafeId(jobId, 'job');
  const path = `videoJobs/${safeId}`;
  try {
    await deleteDoc(doc(db, 'videoJobs', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTicketToFirestore(
  uid: string,
  ticket: PurchasedTicket
): Promise<void> {
  if (!ID_PATTERN.test(uid) || uid.length > 128) return;
  const safeId = toSafeId(ticket.id, 'tkt');
  const path = `tickets/${safeId}`;

  const payload = {
    id: safeId,
    ownerId: uid,
    concertId: toSafeId(ticket.concertId || 'concert_1', 'concert'),
    concertTitle: (ticket.concertTitle || 'Concert Oude Mill').slice(0, 160),
    artistName: (ticket.artistName || 'Oude Mill').slice(0, 100),
    stadiumName: (ticket.stadiumName || 'Stade du 26-Mars').slice(0, 120),
    city: (ticket.city || 'Bamako').slice(0, 80),
    concertDate: (ticket.concertDate || '2026').slice(0, 60),
    tier: ticket.tier === 'vip' || ticket.tier === 'vvip' ? ticket.tier : 'standard',
    categoryName: (ticket.categoryName || 'Standard').slice(0, 80),
    priceFCFA: typeof ticket.priceFCFA === 'number' && ticket.priceFCFA >= 0 ? Math.min(ticket.priceFCFA, 10000000) : 0,
    seatNumber: (ticket.seatNumber || 'A-01').slice(0, 40),
    gateNumber: (ticket.gateNumber || 'Porte A').slice(0, 40),
    qrHash: (ticket.qrHash || `BGLA_${safeId}`).slice(0, 160),
    status: 'valid',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'tickets', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeUserTickets(
  uid: string,
  onData: (tickets: PurchasedTicket[]) => void
): () => void {
  const path = 'tickets';
  const q = query(
    collection(db, path),
    where('ownerId', '==', uid),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const listWithTs = snapshot.docs
        .map((d) => {
          const data = d.data();
          const ts = toTimestampMs(data.createdAt);
          const ticket: PurchasedTicket = {
            id: String(data.id || d.id),
            concertId: String(data.concertId || ''),
            concertTitle: String(data.concertTitle || ''),
            artistName: String(data.artistName || 'Oude Mill'),
            stadiumName: String(data.stadiumName || ''),
            city: String(data.city || ''),
            country: 'Mali',
            concertDate: String(data.concertDate || ''),
            buyerName: 'Titulaire vérifié',
            buyerPhone: '',
            tier: (data.tier as PurchasedTicket['tier']) || 'standard',
            categoryName: String(data.categoryName || ''),
            priceFCFA: Number(data.priceFCFA || 0),
            paymentMethod: 'wave',
            transactionRef: String(data.id || d.id),
            purchaseDate: new Date(ts).toLocaleDateString('fr-FR'),
            seatNumber: String(data.seatNumber || ''),
            gateNumber: String(data.gateNumber || ''),
            qrHash: String(data.qrHash || ''),
            status: (data.status as PurchasedTicket['status']) || 'valid',
          };
          return { ts, ticket };
        })
        .sort((a, b) => b.ts - a.ts);
      onData(listWithTs.map((item) => item.ticket));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveFanReviewToFirestore(
  uid: string,
  authorName: string,
  authorPhotoURL: string | undefined,
  rating: number,
  comment: string
): Promise<void> {
  if (!ID_PATTERN.test(uid) || uid.length > 128) return;
  const safeId = `review_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `fanReviews/${safeId}`;

  const payload = {
    id: safeId,
    ownerId: uid,
    authorName: (authorName || 'Fan BGla Mac').slice(0, 80),
    ...(authorPhotoURL ? { authorPhotoURL: authorPhotoURL.slice(0, 500) } : {}),
    rating: typeof rating === 'number' ? Math.min(Math.max(Math.round(rating), 1), 5) : 5,
    comment: (comment || '').trim().slice(0, 1000),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'fanReviews', safeId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeFanReviews(
  onData: (reviews: FanReview[]) => void
): () => void {
  const path = 'fanReviews';
  const q = query(
    collection(db, path),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const listWithTs = snapshot.docs
        .map((d) => {
          const data = d.data();
          const ts = toTimestampMs(data.createdAt);
          const review: FanReview = {
            id: String(data.id || d.id),
            ownerId: String(data.ownerId || ''),
            authorName: String(data.authorName || 'Fan BGla Mac'),
            authorPhotoURL: data.authorPhotoURL ? String(data.authorPhotoURL) : undefined,
            rating: Number(data.rating || 5),
            comment: String(data.comment || ''),
            createdAt: ts,
          };
          return { ts, review };
        })
        .sort((a, b) => b.ts - a.ts);
      onData(listWithTs.map((item) => item.review));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

