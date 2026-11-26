import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE_PATH = path.resolve(__dirname, '../../data/bgla_mac_db.json');

export interface CreatorAccount {
  id: string;
  name: string;
  tagline: string;
  avatar: string;
  email: string;
  phone: string;
  stripeConnect: {
    accountId: string;
    status: 'connected' | 'pending' | 'restricted';
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    currency: string;
    country: string;
  };
  paypalAccount: {
    merchantId: string;
    email: string;
    status: 'verified' | 'unverified';
  };
  mobileMoney: {
    provider: 'wave' | 'orange_money' | 'moov_money' | 'mtn_momo';
    phoneNumber: string;
    holderName: string;
  };
  balanceFCFA: number; // Available for payout
  totalGrossFCFA: number; // 100% volume
  totalNetCreatorFCFA: number; // 95% total earned
  totalPlatformFeesFCFA: number; // 5% total platform share
  totalPayoutsPaidFCFA: number; // Already transferred
  subscription: {
    status: 'active' | 'pending' | 'expired';
    monthlyFeeFCFA: number; // 10 000 FCFA
    currentPeriodStart: string;
    currentPeriodEnd: string;
    autoRenew: boolean;
    lastPaymentRef: string;
  };
}

export interface TransactionRecord {
  id: string;
  type: 'ticket_purchase' | 'artist_subscription' | 'merch_purchase';
  creatorId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  amount: number; // total amount (FCFA)
  commission: number; // amount * 0.05 (5% platform fee)
  artistAmount: number; // amount - commission (95% net creator)
  commissionRate: number; // 0.05 (5%)
  amountGrossFCFA: number;
  amountGrossEUR: number;
  splitRule: '95_5';
  creatorShareFCFA: number; // 95%
  platformFeeFCFA: number; // 5%
  creatorShareEUR: number;
  platformFeeEUR: number;
  paymentProvider: 'stripe_connect' | 'paypal' | 'wave' | 'orange_money' | 'moov_money' | 'mtn_momo' | 'card';
  providerTransactionId: string;
  status: 'pending' | 'succeeded' | 'processing' | 'refunded' | 'failed' | 'cancelled';
  itemDescription: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface TicketRecord {
  id: string;
  transactionId: string;
  concertId: string;
  concertTitle: string;
  artistName: string;
  stadiumName: string;
  city: string;
  country: string;
  concertDate: string;
  concertTime: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  tier: 'standard' | 'vip' | 'vvip';
  categoryName: string;
  priceFCFA: number;
  paymentMethod: string;
  transactionRef: string;
  purchaseDate: string;
  seatNumber: string;
  gateNumber: string;
  qrHash: string;
  status: 'valid' | 'used' | 'cancelled';
  usedAt?: string;
  scannedBy?: string;
}

export interface PayoutRecord {
  id: string;
  creatorId: string;
  amountFCFA: number;
  amountEUR: number;
  method: 'stripe_connect' | 'paypal' | 'wave' | 'orange_money';
  destination: string;
  status: 'paid' | 'processing';
  reference: string;
  createdAt: string;
}

export interface PaymentSessionRecord {
  id: string; // pay_session_...
  transactionId: string; // tx_...
  type: 'ticket_purchase' | 'artist_subscription' | 'merch_purchase';
  creatorId: string;
  amount: number; // total amount (FCFA)
  commission: number; // amount * 0.05 (5% platform commission)
  artistAmount: number; // amount - commission (95% artist net)
  commissionRate: number; // 0.05
  amountFCFA: number;
  amountEUR: number;
  currency: string; // 'XOF' or 'EUR'
  paymentProvider: 'wave' | 'orange_money' | 'moov_money' | 'mtn_momo' | 'stripe_connect' | 'paypal' | 'card';
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  itemDescription: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  split: {
    totalFCFA: number;
    creatorShareFCFA: number;
    platformFeeFCFA: number;
    creatorPercent: number;
    platformPercent: number;
  };
  concert?: {
    id: string;
    title: string;
    artistName: string;
    stadium: string;
    city: string;
    country: string;
    date: string;
    tier: 'standard' | 'vip' | 'vvip';
  };
  ticketId?: string;
  qrHash?: string;
  checkoutUrl: string;
  callbackUrl: string;
  webhookUrl: string;
  statusUrl: string;
  ussdCode?: string;
  providerReference?: string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

export interface WebhookLogRecord {
  id: string;
  provider: string;
  event: string;
  payload: any;
  status: 'processed' | 'ignored' | 'failed';
  paymentId?: string;
  transactionId?: string;
  receivedAt: string;
}

export interface DatabaseSchema {
  version: string;
  platform: {
    name: string;
    currency: string;
    exchangeRateEURtoFCFA: number; // 1 EUR ≈ 655.957 FCFA
    platformCommissionPercent: number; // 5%
    creatorSharePercent: number; // 95%
    artistMonthlyFeeFCFA: number; // 10 000 FCFA
  };
  creators: Record<string, CreatorAccount>;
  transactions: TransactionRecord[];
  tickets: TicketRecord[];
  payouts: PayoutRecord[];
  paymentSessions: PaymentSessionRecord[];
  webhookLogs: WebhookLogRecord[];
}

const INITIAL_DATABASE: DatabaseSchema = {
  version: '2.0.0',
  platform: {
    name: 'BGla Mac',
    currency: 'XOF / FCFA',
    exchangeRateEURtoFCFA: 655.957,
    platformCommissionPercent: 5,
    creatorSharePercent: 95,
    artistMonthlyFeeFCFA: 10000,
  },
  creators: {
    'artist-oude-mill': {
      id: 'artist-oude-mill',
      name: 'Oude Mill',
      tagline: 'L’étoile montante du Hip-Hop Mandingue & Trap Africaine',
      avatar: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=400&q=80',
      email: 'contact@oudemill-music.com',
      phone: '+223 76 00 11 22',
      stripeConnect: {
        accountId: 'acct_1OuDeMiLL955BKO',
        status: 'connected',
        chargesEnabled: true,
        payoutsEnabled: true,
        currency: 'eur',
        country: 'ML',
      },
      paypalAccount: {
        merchantId: 'PP-MALI-OUDEMILL-88',
        email: 'payouts@oudemill-music.com',
        status: 'verified',
      },
      mobileMoney: {
        provider: 'wave',
        phoneNumber: '+223 76 00 11 22',
        holderName: 'Oumar Dembélé (Oude Mill)',
      },
      balanceFCFA: 3825000, // Solde disponible
      totalGrossFCFA: 6850000, // Total brut généré
      totalNetCreatorFCFA: 6507500, // 95% net
      totalPlatformFeesFCFA: 342500, // 5% commission BGla Mac
      totalPayoutsPaidFCFA: 2682500, // Déjà viré vers Stripe/Wave
      subscription: {
        status: 'active',
        monthlyFeeFCFA: 10000,
        currentPeriodStart: '2026-10-05T00:00:00.000Z',
        currentPeriodEnd: '2026-11-05T00:00:00.000Z',
        autoRenew: true,
        lastPaymentRef: 'SUB-OM-20261005',
      },
    },
  },
  transactions: [
    {
      id: 'tx_bko_init_001',
      type: 'ticket_purchase',
      creatorId: 'artist-oude-mill',
      buyerName: 'Moussa Keïta',
      buyerPhone: '+223 70 12 34 56',
      buyerEmail: 'moussa.keita@gmail.com',
      amount: 50000,
      commission: 2500,
      artistAmount: 47500,
      commissionRate: 0.05,
      amountGrossFCFA: 50000,
      amountGrossEUR: 76.22,
      splitRule: '95_5',
      creatorShareFCFA: 47500,
      platformFeeFCFA: 2500,
      creatorShareEUR: 72.41,
      platformFeeEUR: 3.81,
      paymentProvider: 'wave',
      providerTransactionId: 'WAVE-ML-9831092',
      status: 'succeeded',
      itemDescription: '1x Billet VVIP - Stade du 26-Mars Bamako',
      createdAt: '2026-10-12T14:32:00.000Z',
    },
    {
      id: 'tx_bko_init_002',
      type: 'ticket_purchase',
      creatorId: 'artist-oude-mill',
      buyerName: 'Fatoumata Traoré',
      buyerPhone: '+223 66 44 22 11',
      buyerEmail: 'fatou.traore@orange.ml',
      amount: 25000,
      commission: 1250,
      artistAmount: 23750,
      commissionRate: 0.05,
      amountGrossFCFA: 25000,
      amountGrossEUR: 38.11,
      splitRule: '95_5',
      creatorShareFCFA: 23750,
      platformFeeFCFA: 1250,
      creatorShareEUR: 36.2,
      platformFeeEUR: 1.91,
      paymentProvider: 'stripe_connect',
      providerTransactionId: 'pi_3OuDeMillBkoVip_secret_998',
      status: 'succeeded',
      itemDescription: '1x Billet VIP - Stade du 26-Mars Bamako',
      createdAt: '2026-10-12T16:15:00.000Z',
    },
    {
      id: 'tx_sub_init_001',
      type: 'artist_subscription',
      creatorId: 'artist-oude-mill',
      buyerName: 'Oude Mill Management',
      buyerPhone: '+223 76 00 11 22',
      buyerEmail: 'contact@oudemill-music.com',
      amount: 10000,
      commission: 10000,
      artistAmount: 0,
      commissionRate: 1.0,
      amountGrossFCFA: 10000,
      amountGrossEUR: 15.24,
      splitRule: '95_5',
      creatorShareFCFA: 0, // platform subscription goes 100% to platform
      platformFeeFCFA: 10000,
      creatorShareEUR: 0,
      platformFeeEUR: 15.24,
      paymentProvider: 'stripe_connect',
      providerTransactionId: 'sub_1OuDeMillPlan_pro',
      status: 'succeeded',
      itemDescription: 'Abonnement Mensuel Artiste BGla Mac (10 000 FCFA/mois)',
      createdAt: '2026-10-05T08:00:00.000Z',
    },
  ],
  tickets: [
    {
      id: 'tkt-init-vvip-001',
      transactionId: 'tx_bko_init_001',
      concertId: 'concert-bko-26mars',
      concertTitle: 'Grand Concert Triomphal - World Tour Live',
      artistName: 'Oude Mill',
      stadiumName: 'Stade du 26-Mars',
      city: 'Bamako',
      country: 'Mali 🇲🇱',
      concertDate: '28 Décembre 2026',
      concertTime: '20h30',
      buyerName: 'Moussa Keïta',
      buyerPhone: '+223 70 12 34 56',
      buyerEmail: 'moussa.keita@gmail.com',
      tier: 'vvip',
      categoryName: 'Pass VVIP Salon Prestige',
      priceFCFA: 50000,
      paymentMethod: 'wave',
      transactionRef: 'BGLA-TX-WAVE-8841',
      purchaseDate: '12/10/2026',
      seatNumber: 'Loge VVIP #12',
      gateNumber: 'Porte Officielle A1',
      qrHash: 'BGLAMAC-AUTH-concert-bko-26mars-VVIP-889104',
      status: 'valid',
    },
    {
      id: 'tkt-init-used-002',
      transactionId: 'tx_bko_init_002',
      concertId: 'concert-bko-26mars',
      concertTitle: 'Grand Concert Triomphal - World Tour Live',
      artistName: 'Oude Mill',
      stadiumName: 'Stade du 26-Mars',
      city: 'Bamako',
      country: 'Mali 🇲🇱',
      concertDate: '28 Décembre 2026',
      concertTime: '20h30',
      buyerName: 'Fatoumata Traoré',
      buyerPhone: '+223 66 44 22 11',
      buyerEmail: 'fatou.traore@orange.ml',
      tier: 'vip',
      categoryName: 'Billet VIP Tribune',
      priceFCFA: 25000,
      paymentMethod: 'stripe_connect',
      transactionRef: 'BGLA-TX-STRIPE-7731',
      purchaseDate: '12/10/2026',
      seatNumber: 'Tribune VIP Rangée 4 Place 19',
      gateNumber: 'Porte VIP B2',
      qrHash: 'BGLAMAC-AUTH-concert-bko-26mars-VIP-443210',
      status: 'used',
      usedAt: '2026-10-12T19:45:00.000Z',
      scannedBy: 'Agent Scanner Porte B2',
    },
  ],
  payouts: [
    {
      id: 'po_init_001',
      creatorId: 'artist-oude-mill',
      amountFCFA: 2682500,
      amountEUR: 4089.44,
      method: 'stripe_connect',
      destination: 'acct_1OuDeMiLL955BKO',
      status: 'paid',
      reference: 'PO-STRIPE-TRF-9921',
      createdAt: '2026-10-10T11:00:00.000Z',
    },
  ],
  paymentSessions: [],
  webhookLogs: [],
};

class DatabaseManager {
  private cache: DatabaseSchema | null = null;

  private ensureDir() {
    const dir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public getDatabase(): DatabaseSchema {
    if (this.cache) {
      if (!this.cache.paymentSessions) this.cache.paymentSessions = [];
      if (!this.cache.webhookLogs) this.cache.webhookLogs = [];
      return this.cache;
    }

    try {
      this.ensureDir();
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        this.cache = JSON.parse(raw);
        if (!this.cache!.paymentSessions) this.cache!.paymentSessions = [];
        if (!this.cache!.webhookLogs) this.cache!.webhookLogs = [];
        return this.cache!;
      }
    } catch (e) {
      console.warn('[DB] Failed reading db.json, initializing fresh seed:', e);
    }

    this.cache = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    if (!this.cache!.paymentSessions) this.cache!.paymentSessions = [];
    if (!this.cache!.webhookLogs) this.cache!.webhookLogs = [];
    this.saveDatabase();
    return this.cache!;
  }

  public saveDatabase(): void {
    if (!this.cache) return;
    try {
      this.ensureDir();
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed writing to db.json:', e);
    }
  }

  public getCreator(id: string = 'artist-oude-mill'): CreatorAccount {
    const db = this.getDatabase();
    if (!db.creators[id]) {
      // Default to initial creator if not found
      return db.creators['artist-oude-mill'] || INITIAL_DATABASE.creators['artist-oude-mill'];
    }
    return db.creators[id];
  }

  public processPaymentWithSplit(params: {
    type: 'ticket_purchase' | 'artist_subscription' | 'merch_purchase';
    creatorId?: string;
    amountFCFA: number;
    paymentProvider: 'stripe_connect' | 'paypal' | 'wave' | 'orange_money' | 'moov_money' | 'mtn_momo' | 'card';
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    itemDescription: string;
    concert?: {
      id: string;
      title: string;
      artistName: string;
      stadium: string;
      city: string;
      country: string;
      date: string;
      tier: 'standard' | 'vip' | 'vvip';
    };
  }): {
    transaction: TransactionRecord;
    ticket?: TicketRecord;
    creator: CreatorAccount;
    split: {
      totalFCFA: number;
      creatorShareFCFA: number; // 95%
      platformFeeFCFA: number; // 5%
      creatorPercent: number;
      platformPercent: number;
    };
  } {
    const db = this.getDatabase();
    const creatorId = params.creatorId || 'artist-oude-mill';
    const creator = this.getCreator(creatorId);

    const isSubscription = params.type === 'artist_subscription';
    const totalFCFA = params.amountFCFA;

    // Split 95/5 calculation
    // Note: For ticket sales, 95% to creator and 5% platform commission
    // For artist subscription (10k FCFA), the 10 000 FCFA goes to BGla Mac platform
    const creatorPercent = isSubscription ? 0 : 95;
    const platformPercent = isSubscription ? 100 : 5;

    const creatorShareFCFA = isSubscription ? 0 : Math.round((totalFCFA * 95) / 100);
    const platformFeeFCFA = totalFCFA - creatorShareFCFA;

    const exchangeRate = db.platform.exchangeRateEURtoFCFA;
    const amountGrossEUR = parseFloat((totalFCFA / exchangeRate).toFixed(2));
    const creatorShareEUR = parseFloat((creatorShareFCFA / exchangeRate).toFixed(2));
    const platformFeeEUR = parseFloat((platformFeeFCFA / exchangeRate).toFixed(2));

    const txId = 'tx_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

    // Mock Provider Transaction IDs reflecting Stripe Connect or PayPal
    let providerTxId = '';
    if (params.paymentProvider === 'stripe_connect' || params.paymentProvider === 'card') {
      providerTxId = `pi_str_${Date.now()}_dest_${creator.stripeConnect.accountId}`;
    } else if (params.paymentProvider === 'paypal') {
      providerTxId = `PAYID-${Math.random().toString(36).substring(2, 10).toUpperCase()}-SPLIT955`;
    } else {
      providerTxId = `${params.paymentProvider.toUpperCase()}-ML-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    const amount = totalFCFA;
    const commissionRate = isSubscription ? 1.0 : 0.05;
    const commission = platformFeeFCFA;
    const artistAmount = creatorShareFCFA;

    const transaction: TransactionRecord = {
      id: txId,
      type: params.type,
      creatorId,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      buyerEmail: params.buyerEmail,
      amount,
      commission,
      artistAmount,
      commissionRate,
      amountGrossFCFA: totalFCFA,
      amountGrossEUR,
      splitRule: '95_5',
      creatorShareFCFA,
      platformFeeFCFA,
      creatorShareEUR,
      platformFeeEUR,
      paymentProvider: params.paymentProvider,
      providerTransactionId: providerTxId,
      status: 'succeeded',
      itemDescription: params.itemDescription,
      createdAt: new Date().toISOString(),
    };

    db.transactions.unshift(transaction);

    // Update Creator Account financials
    if (!isSubscription) {
      creator.balanceFCFA += creatorShareFCFA;
      creator.totalGrossFCFA += totalFCFA;
      creator.totalNetCreatorFCFA += creatorShareFCFA;
      creator.totalPlatformFeesFCFA += platformFeeFCFA;
    } else {
      // Renew artist subscription for 30 days
      const now = new Date();
      const end = new Date();
      end.setDate(now.getDate() + 30);
      creator.subscription.status = 'active';
      creator.subscription.currentPeriodStart = now.toISOString();
      creator.subscription.currentPeriodEnd = end.toISOString();
      creator.subscription.lastPaymentRef = txId;
    }

    let ticket: TicketRecord | undefined = undefined;

    // If ticket purchase, generate the official verified Ticket
    if (params.type === 'ticket_purchase' && params.concert) {
      const seatPrefix = params.concert.tier === 'vvip' ? 'VVIP Loge' : params.concert.tier === 'vip' ? 'Tribune VIP' : 'Pelouse Gradin';
      const seatNum = `${seatPrefix} #${Math.floor(1 + Math.random() * 200)}`;
      const gateNum = params.concert.tier === 'vvip' ? 'Porte A (VIP Express)' : params.concert.tier === 'vip' ? 'Porte B (Tribune)' : 'Porte C (Générale)';
      const qrHash = `BGLAMAC-AUTH-${params.concert.id}-${params.concert.tier.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

      ticket = {
        id: 'tkt-' + Date.now(),
        transactionId: txId,
        concertId: params.concert.id,
        concertTitle: params.concert.title,
        artistName: params.concert.artistName,
        stadiumName: params.concert.stadium,
        city: params.concert.city,
        country: params.concert.country,
        concertDate: params.concert.date,
        concertTime: '20h30',
        buyerName: params.buyerName,
        buyerPhone: params.buyerPhone,
        buyerEmail: params.buyerEmail,
        tier: params.concert.tier,
        categoryName: params.concert.tier.toUpperCase(),
        priceFCFA: totalFCFA,
        paymentMethod: params.paymentProvider,
        transactionRef: txId,
        purchaseDate: new Date().toLocaleDateString('fr-FR'),
        seatNumber: seatNum,
        gateNumber: gateNum,
        qrHash,
        status: 'valid',
      };

      db.tickets.unshift(ticket);
    }

    const sessionId = 'pay_' + txId.replace('tx_', '');
    const sessionRecord: PaymentSessionRecord = {
      id: sessionId,
      transactionId: txId,
      type: params.type,
      creatorId,
      amount,
      commission,
      artistAmount,
      commissionRate,
      amountFCFA: totalFCFA,
      amountEUR: amountGrossEUR,
      currency: 'XOF',
      paymentProvider: params.paymentProvider,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      buyerEmail: params.buyerEmail,
      itemDescription: params.itemDescription,
      status: 'succeeded',
      split: {
        totalFCFA,
        creatorShareFCFA,
        platformFeeFCFA,
        creatorPercent,
        platformPercent,
      },
      concert: params.concert,
      ticketId: ticket?.id,
      qrHash: ticket?.qrHash,
      checkoutUrl: `/payment/callback?paymentId=${sessionId}&status=success`,
      callbackUrl: `/payment/callback`,
      webhookUrl: `/payment/webhook`,
      statusUrl: `/payment/status?paymentId=${sessionId}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      completedAt: new Date().toISOString(),
    };
    db.paymentSessions.unshift(sessionRecord);

    db.creators[creatorId] = creator;
    this.saveDatabase();

    return {
      transaction,
      ticket,
      creator,
      split: {
        totalFCFA,
        creatorShareFCFA,
        platformFeeFCFA,
        creatorPercent,
        platformPercent,
      },
    };
  }

  public verifyTicket(qrHash: string): {
    valid: boolean;
    ticket?: TicketRecord;
    reason?: 'NOT_FOUND' | 'ALREADY_USED' | 'CANCELLED';
  } {
    const db = this.getDatabase();
    const cleanHash = qrHash.trim();
    const ticket = db.tickets.find((t) => t.qrHash === cleanHash || t.id === cleanHash || t.transactionRef === cleanHash);

    if (!ticket) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (ticket.status === 'used') {
      return { valid: false, ticket, reason: 'ALREADY_USED' };
    }

    if (ticket.status === 'cancelled') {
      return { valid: false, ticket, reason: 'CANCELLED' };
    }

    return { valid: true, ticket };
  }

  public punchTicket(qrHash: string, scannedBy: string = 'Agent Portique Scanner'): {
    success: boolean;
    ticket?: TicketRecord;
    error?: string;
  } {
    const db = this.getDatabase();
    const cleanHash = qrHash.trim();
    const ticket = db.tickets.find((t) => t.qrHash === cleanHash || t.id === cleanHash || t.transactionRef === cleanHash);

    if (!ticket) {
      return { success: false, error: 'Billet non trouvé dans la base de données BGla Mac' };
    }

    if (ticket.status === 'used') {
      return {
        success: false,
        ticket,
        error: `Billet déjà scanné et utilisé le ${ticket.usedAt ? new Date(ticket.usedAt).toLocaleString('fr-FR') : 'précédemment'} par ${ticket.scannedBy || 'un agent'}. Entrée refusée.`,
      };
    }

    ticket.status = 'used';
    ticket.usedAt = new Date().toISOString();
    ticket.scannedBy = scannedBy;

    this.saveDatabase();
    return { success: true, ticket };
  }

  public requestCreatorPayout(creatorId: string, amountFCFA: number, method: 'stripe_connect' | 'paypal' | 'wave' | 'orange_money'): {
    success: boolean;
    payout?: PayoutRecord;
    creator?: CreatorAccount;
    error?: string;
  } {
    const db = this.getDatabase();
    const creator = this.getCreator(creatorId);

    if (amountFCFA <= 0) {
      return { success: false, error: 'Le montant du virement doit être supérieur à zéro.' };
    }

    if (creator.balanceFCFA < amountFCFA) {
      return {
        success: false,
        error: `Solde insuffisant. Solde disponible : ${creator.balanceFCFA.toLocaleString('fr-FR')} FCFA.`,
      };
    }

    let destination = '';
    if (method === 'stripe_connect') {
      destination = creator.stripeConnect.accountId;
    } else if (method === 'paypal') {
      destination = creator.paypalAccount.email;
    } else {
      destination = `${creator.mobileMoney.phoneNumber} (${creator.mobileMoney.holderName})`;
    }

    const exchangeRate = db.platform.exchangeRateEURtoFCFA;
    const amountEUR = parseFloat((amountFCFA / exchangeRate).toFixed(2));

    const payout: PayoutRecord = {
      id: 'po_' + Date.now(),
      creatorId,
      amountFCFA,
      amountEUR,
      method,
      destination,
      status: 'paid',
      reference: `PO-${method.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString(),
    };

    creator.balanceFCFA -= amountFCFA;
    creator.totalPayoutsPaidFCFA += amountFCFA;

    db.payouts.unshift(payout);
    db.creators[creatorId] = creator;

    this.saveDatabase();

    return {
      success: true,
      payout,
      creator,
    };
  }

  public saveTransaction(params: {
    amount: number;
    commission?: number;
    artistAmount?: number;
    commissionRate?: number;
    status?: 'pending' | 'succeeded' | 'processing' | 'refunded' | 'failed' | 'cancelled';
    id?: string;
    type?: 'ticket_purchase' | 'artist_subscription' | 'merch_purchase';
    creatorId?: string;
    buyerName?: string;
    buyerPhone?: string;
    buyerEmail?: string;
    paymentProvider?: any;
    providerTransactionId?: string;
    itemDescription?: string;
    concert?: any;
    metadata?: Record<string, any>;
  }): TransactionRecord {
    const db = this.getDatabase();
    const amount = Number(params.amount);
    const commissionRate = params.commissionRate !== undefined ? Number(params.commissionRate) : 0.05;
    const commission = params.commission !== undefined ? Number(params.commission) : Math.round(amount * commissionRate);
    const artistAmount = params.artistAmount !== undefined ? Number(params.artistAmount) : amount - commission;

    const exchangeRate = db.platform.exchangeRateEURtoFCFA;
    const amountGrossEUR = parseFloat((amount / exchangeRate).toFixed(2));
    const creatorShareEUR = parseFloat((artistAmount / exchangeRate).toFixed(2));
    const platformFeeEUR = parseFloat((commission / exchangeRate).toFixed(2));

    const txId = params.id || ('tx_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000));
    const provider = params.paymentProvider || 'wave';

    const transaction: TransactionRecord = {
      id: txId,
      type: params.type || 'ticket_purchase',
      creatorId: params.creatorId || 'artist-oude-mill',
      buyerName: params.buyerName || 'Client BGla Mac',
      buyerPhone: params.buyerPhone || '+223 76 00 00 00',
      buyerEmail: params.buyerEmail,
      amount,
      commission,
      artistAmount,
      commissionRate,
      amountGrossFCFA: amount,
      amountGrossEUR,
      splitRule: '95_5',
      creatorShareFCFA: artistAmount,
      platformFeeFCFA: commission,
      creatorShareEUR,
      platformFeeEUR,
      paymentProvider: provider,
      providerTransactionId: params.providerTransactionId || `${provider.toUpperCase()}-TX-${Date.now()}`,
      status: params.status || 'pending',
      itemDescription: params.itemDescription || 'Paiement BGla Mac',
      metadata: params.metadata || (params.concert ? { concert: params.concert } : undefined),
      createdAt: new Date().toISOString(),
    };

    const existingIdx = db.transactions.findIndex((t) => t.id === txId);
    if (existingIdx >= 0) {
      db.transactions[existingIdx] = { ...db.transactions[existingIdx], ...transaction };
    } else {
      db.transactions.unshift(transaction);
    }

    this.saveDatabase();
    return transaction;
  }

  public createPaymentSession(params: {
    type?: 'ticket_purchase' | 'artist_subscription' | 'merch_purchase';
    creatorId?: string;
    amountFCFA: number;
    currency?: string;
    paymentProvider?: 'wave' | 'orange_money' | 'moov_money' | 'mtn_momo' | 'stripe_connect' | 'paypal' | 'card';
    buyerName: string;
    buyerPhone: string;
    buyerEmail?: string;
    itemDescription?: string;
    concert?: {
      id: string;
      title: string;
      artistName: string;
      stadium: string;
      city: string;
      country: string;
      date: string;
      tier: 'standard' | 'vip' | 'vvip';
    };
    returnUrl?: string;
    callbackUrl?: string;
    webhookUrl?: string;
  }): PaymentSessionRecord {
    const db = this.getDatabase();
    const creatorId = params.creatorId || 'artist-oude-mill';
    const type = params.type || 'ticket_purchase';
    const amount = Number(params.amountFCFA);
    const provider = params.paymentProvider || 'wave';

    // Exact commission calculation formula requested by user
    const commissionRate = 0.05;
    const commission = amount * commissionRate;
    const artistAmount = amount - commission;

    const creatorPercent = type === 'artist_subscription' ? 0 : 95;
    const platformPercent = type === 'artist_subscription' ? 100 : 5;
    const creatorShareFCFA = type === 'artist_subscription' ? 0 : artistAmount;
    const platformFeeFCFA = type === 'artist_subscription' ? amount : commission;

    const exchangeRate = db.platform.exchangeRateEURtoFCFA;
    const amountEUR = parseFloat((amount / exchangeRate).toFixed(2));

    const sessionId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const transactionId = 'tx_' + Date.now() + '_' + Math.floor(1000 + Math.random() * 9000);

    // Save pending transaction directly in database
    this.saveTransaction({
      id: transactionId,
      amount,
      commission,
      artistAmount,
      commissionRate,
      status: 'pending',
      creatorId,
      type,
      paymentProvider: provider,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      buyerEmail: params.buyerEmail,
      itemDescription: params.itemDescription || 'Paiement BGla Mac',
      concert: params.concert,
    });

    let ussdCode: string | undefined = undefined;
    if (provider === 'orange_money') {
      ussdCode = `*144*4*${amount}#`;
    } else if (provider === 'moov_money') {
      ussdCode = `*166*2*${amount}#`;
    } else if (provider === 'mtn_momo') {
      ussdCode = `*133*${amount}#`;
    } else if (provider === 'wave') {
      ussdCode = `wave://pay?amount=${amount}&ref=${sessionId}`;
    }

    const defaultCallback = params.callbackUrl || params.returnUrl || `/payment/callback?paymentId=${sessionId}&transactionId=${transactionId}`;
    const defaultWebhook = params.webhookUrl || `/payment/webhook`;
    const defaultStatus = `/payment/status?paymentId=${sessionId}`;

    const session: PaymentSessionRecord = {
      id: sessionId,
      transactionId,
      type,
      creatorId,
      amount,
      commission,
      artistAmount,
      commissionRate,
      amountFCFA: amount,
      amountEUR,
      currency: params.currency || 'XOF',
      paymentProvider: provider,
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      buyerEmail: params.buyerEmail,
      itemDescription: params.itemDescription || 'Paiement BGla Mac',
      status: 'pending',
      split: {
        totalFCFA: amount,
        creatorShareFCFA,
        platformFeeFCFA,
        creatorPercent,
        platformPercent,
      },
      concert: params.concert,
      checkoutUrl: defaultCallback,
      callbackUrl: defaultCallback,
      webhookUrl: defaultWebhook,
      statusUrl: defaultStatus,
      ussdCode,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
    };

    db.paymentSessions.unshift(session);
    this.saveDatabase();
    return session;
  }

  public getPaymentSession(idOrTxId: string): PaymentSessionRecord | undefined {
    const db = this.getDatabase();
    const clean = idOrTxId.trim();
    return db.paymentSessions.find(
      (s) => s.id === clean || s.transactionId === clean || s.qrHash === clean
    );
  }

  public finalizePaymentSession(
    idOrTxId: string,
    status: 'succeeded' | 'failed' | 'cancelled',
    providerReference?: string
  ): {
    success: boolean;
    session?: PaymentSessionRecord;
    transaction?: TransactionRecord;
    ticket?: TicketRecord;
    error?: string;
  } {
    const db = this.getDatabase();
    const clean = idOrTxId.trim();
    const session = db.paymentSessions.find(
      (s) => s.id === clean || s.transactionId === clean || s.qrHash === clean
    );

    if (!session) {
      // If no session exists, try finding a transaction directly
      const existingTx = db.transactions.find((t) => t.id === clean);
      if (existingTx) {
        const ticket = db.tickets.find((t) => t.transactionId === existingTx.id);
        return { success: true, transaction: existingTx, ticket };
      }
      return { success: false, error: `Session de paiement ${clean} introuvable` };
    }

    if (session.status === 'succeeded') {
      const tx = db.transactions.find((t) => t.id === session.transactionId);
      const ticket = session.ticketId ? db.tickets.find((t) => t.id === session.ticketId) : undefined;
      return { success: true, session, transaction: tx, ticket };
    }

    session.status = status;
    session.completedAt = new Date().toISOString();
    if (providerReference) {
      session.providerReference = providerReference;
    }

    if (status === 'succeeded') {
      // Process split 95/5 and issue ticket into database
      const result = this.processPaymentWithSplit({
        type: session.type,
        creatorId: session.creatorId,
        amountFCFA: session.amountFCFA,
        paymentProvider: session.paymentProvider,
        buyerName: session.buyerName,
        buyerPhone: session.buyerPhone,
        buyerEmail: session.buyerEmail,
        itemDescription: session.itemDescription,
        concert: session.concert,
      });

      // Synchronize transaction ID
      result.transaction.id = session.transactionId;
      if (result.ticket) {
        result.ticket.transactionId = session.transactionId;
        session.ticketId = result.ticket.id;
        session.qrHash = result.ticket.qrHash;
      }

      this.saveDatabase();
      return {
        success: true,
        session,
        transaction: result.transaction,
        ticket: result.ticket,
      };
    }

    this.saveDatabase();
    return { success: true, session };
  }

  public logWebhook(
    provider: string,
    event: string,
    payload: any,
    status: 'processed' | 'ignored' | 'failed',
    paymentId?: string,
    transactionId?: string
  ): WebhookLogRecord {
    const db = this.getDatabase();
    const log: WebhookLogRecord = {
      id: 'wh_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      provider,
      event,
      payload,
      status,
      paymentId,
      transactionId,
      receivedAt: new Date().toISOString(),
    };

    db.webhookLogs.unshift(log);
    if (db.webhookLogs.length > 100) {
      db.webhookLogs = db.webhookLogs.slice(0, 100);
    }
    this.saveDatabase();
    return log;
  }

  public getPaymentStatus(query: string): {
    found: boolean;
    session?: PaymentSessionRecord;
    transaction?: TransactionRecord;
    ticket?: TicketRecord;
    status: 'succeeded' | 'pending' | 'failed' | 'cancelled' | 'unknown';
    amountFCFA?: number;
    split?: any;
    provider?: string;
    buyerName?: string;
    buyerPhone?: string;
  } {
    const db = this.getDatabase();
    const clean = query.trim();

    // 1. Search in sessions
    const session = db.paymentSessions.find(
      (s) => s.id === clean || s.transactionId === clean || s.qrHash === clean
    );
    if (session) {
      const tx = db.transactions.find((t) => t.id === session.transactionId);
      const ticket = session.ticketId ? db.tickets.find((t) => t.id === session.ticketId) : undefined;
      return {
        found: true,
        session,
        transaction: tx,
        ticket,
        status: session.status,
        amountFCFA: session.amountFCFA,
        split: session.split,
        provider: session.paymentProvider,
        buyerName: session.buyerName,
        buyerPhone: session.buyerPhone,
      };
    }

    // 2. Search in transactions
    const tx = db.transactions.find((t) => t.id === clean || t.providerTransactionId === clean);
    if (tx) {
      const ticket = db.tickets.find((t) => t.transactionId === tx.id);
      return {
        found: true,
        transaction: tx,
        ticket,
        status: tx.status as any,
        amountFCFA: tx.amountGrossFCFA,
        split: {
          totalFCFA: tx.amountGrossFCFA,
          creatorShareFCFA: tx.creatorShareFCFA,
          platformFeeFCFA: tx.platformFeeFCFA,
          creatorPercent: tx.type === 'artist_subscription' ? 0 : 95,
          platformPercent: tx.type === 'artist_subscription' ? 100 : 5,
        },
        provider: tx.paymentProvider,
        buyerName: tx.buyerName,
        buyerPhone: tx.buyerPhone,
      };
    }

    // 3. Search in tickets
    const ticket = db.tickets.find(
      (t) => t.id === clean || t.qrHash === clean || t.transactionRef === clean
    );
    if (ticket) {
      return {
        found: true,
        ticket,
        status: ticket.status === 'valid' || ticket.status === 'used' ? 'succeeded' : 'cancelled',
        amountFCFA: ticket.priceFCFA,
        provider: ticket.paymentMethod,
        buyerName: ticket.buyerName,
        buyerPhone: ticket.buyerPhone,
      };
    }

    return { found: false, status: 'unknown' };
  }

  public getStats() {
    const db = this.getDatabase();
    return {
      platform: db.platform,
      totalTransactions: db.transactions.length,
      totalTickets: db.tickets.length,
      totalPayouts: db.payouts.length,
      totalSessions: db.paymentSessions.length,
      totalWebhooks: db.webhookLogs.length,
      totalGrossFCFA: db.transactions
        .filter((t) => t.type === 'ticket_purchase')
        .reduce((sum, t) => sum + t.amountGrossFCFA, 0),
      totalCreatorSharesFCFA: db.transactions
        .filter((t) => t.type === 'ticket_purchase')
        .reduce((sum, t) => sum + t.creatorShareFCFA, 0),
      totalPlatformFeesFCFA: db.transactions.reduce((sum, t) => sum + t.platformFeeFCFA, 0),
    };
  }
}

export const dbManager = new DatabaseManager();

export async function saveTransaction(params: {
  amount: number;
  commission?: number;
  artistAmount?: number;
  commissionRate?: number;
  status?: 'pending' | 'succeeded' | 'processing' | 'refunded' | 'failed' | 'cancelled';
  [key: string]: any;
}): Promise<TransactionRecord> {
  return dbManager.saveTransaction(params as any);
}
