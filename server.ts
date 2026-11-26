import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Increase JSON body limit for photo uploads
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Helper to get GoogleGenAI client
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing from environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

import { dbManager, saveTransaction } from './src/server/database.js';

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'veo-3.1-fast-generate-preview',
    splitRatio: '95/5',
    supportedGateways: ['stripe_connect', 'paypal', 'wave', 'orange_money', 'moov_money'],
  });
});

// ========================================================
// [API Backend] Endpoints: Payments, Split 95/5, Database & Creator Accounts
// ========================================================

// --------------------------------------------------------
// ROUTE 1: /payment/create (and /api/payment/create, /api/payments/create)
// Initiate a payment session (Tickets, Subscription, Merch) with Split 95/5
// --------------------------------------------------------
const handlePaymentCreate = async (req: express.Request, res: express.Response) => {
  try {
    const {
      amount: rawAmount,
      amountFCFA,
      currency = 'XOF',
      provider,
      paymentProvider,
      type = 'ticket_purchase',
      creatorId = 'artist-oude-mill',
      buyerName,
      buyerPhone,
      buyerEmail,
      description,
      itemDescription,
      concert,
      returnUrl,
      callbackUrl,
      webhookUrl,
    } = req.body || {};

    const finalAmount = Number(amountFCFA || rawAmount);
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Montant invalide en FCFA. Veuillez spécifier un montant positif dans "amount" ou "amountFCFA".',
      });
    }

    if (!buyerName || !buyerPhone) {
      return res.status(400).json({
        success: false,
        error: 'Coordonnées requises : "buyerName" (nom du porteur) et "buyerPhone" (numéro mobile money).',
      });
    }

    const finalProvider = (paymentProvider || provider || 'wave') as any;
    const finalDescription = itemDescription || description || 'Billet concert BGla Mac';

    // Exact commission calculation formula requested by user
    const amount = finalAmount;
    const commissionRate = 0.05;

    const commission = amount * commissionRate;
    const artistAmount = amount - commission;

    await saveTransaction({
      amount,
      commission,
      artistAmount,
      status: "pending",
      creatorId,
      type,
      paymentProvider: finalProvider,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerEmail: buyerEmail ? buyerEmail.trim() : undefined,
      itemDescription: finalDescription,
      concert,
    });

    const session = dbManager.createPaymentSession({
      type,
      creatorId,
      amountFCFA: finalAmount,
      currency,
      paymentProvider: finalProvider,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerEmail: buyerEmail ? buyerEmail.trim() : undefined,
      itemDescription: finalDescription,
      concert,
      returnUrl,
      callbackUrl,
      webhookUrl,
    });

    console.log(`[Payment Created] Session: ${session.id} | Tx: ${session.transactionId} | Amount: ${amount} FCFA | Commission (5%): ${commission} FCFA | Artist Amount (95%): ${artistAmount} FCFA | Status: pending | Provider: ${finalProvider}`);

    return res.status(201).json({
      success: true,
      status: 'pending',
      amount,
      commission,
      artistAmount,
      commissionRate,
      paymentId: session.id,
      transactionId: session.transactionId,
      amountFCFA: session.amountFCFA,
      amountEUR: session.amountEUR,
      currency: session.currency,
      provider: session.paymentProvider,
      split: session.split,
      checkoutUrl: session.checkoutUrl,
      callbackUrl: session.callbackUrl,
      webhookUrl: session.webhookUrl,
      statusUrl: session.statusUrl,
      ussdCode: session.ussdCode,
      instructions: session.ussdCode
        ? `Composez le code USSD ${session.ussdCode} sur votre téléphone ou validez la notification push ${session.paymentProvider.toUpperCase()}.`
        : `Procédez au règlement sécurisé sur la passerelle ${session.paymentProvider}.`,
      buyer: {
        name: session.buyerName,
        phone: session.buyerPhone,
        email: session.buyerEmail,
      },
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  } catch (error: any) {
    console.error('[Payment Create Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur interne lors de la création du paiement.',
    });
  }
};

app.post('/payment/create', handlePaymentCreate);
app.post('/api/payment/create', handlePaymentCreate);
app.post('/api/payments/create', handlePaymentCreate);

// --------------------------------------------------------
// ROUTE 2: /payment/callback (and /api/payment/callback, /api/payments/callback)
// Return redirect endpoint called by gateways or users after payment
// --------------------------------------------------------
const handlePaymentCallback = (req: express.Request, res: express.Response) => {
  try {
    const paymentId = (req.query.paymentId ||
      req.query.session_id ||
      req.query.id ||
      req.query.transactionId ||
      req.query.transaction_id ||
      req.body?.paymentId ||
      req.body?.transactionId ||
      '') as string;

    const rawStatus = (req.query.status || req.body?.status || 'success') as string;
    const providerRef = (req.query.ref ||
      req.query.reference ||
      req.query.token ||
      req.body?.providerReference ||
      `CALLBACK-${Date.now()}`) as string;

    const normalizedStatus =
      rawStatus === 'cancel' || rawStatus === 'cancelled'
        ? 'cancelled'
        : rawStatus === 'fail' || rawStatus === 'failed' || rawStatus === 'error'
        ? 'failed'
        : 'succeeded';

    let result: any = { success: false };
    if (paymentId) {
      result = dbManager.finalizePaymentSession(paymentId, normalizedStatus, providerRef);
    } else {
      // If no ID passed, try fetching most recent session
      const db = dbManager.getDatabase();
      const latest = db.paymentSessions[0];
      if (latest) {
        result = dbManager.finalizePaymentSession(latest.id, normalizedStatus, providerRef);
      }
    }

    console.log(`[Payment Callback] ID: ${paymentId || 'latest'} | Status: ${normalizedStatus} | Result: ${result.success ? 'Confirmed' : 'Error'}`);

    // If client expects JSON or format=json specified
    const wantsJson =
      req.query.format === 'json' ||
      req.path.startsWith('/api/') ||
      (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'));

    if (wantsJson) {
      return res.status(200).json({
        success: result.success,
        status: normalizedStatus,
        paymentId: result.session?.id || paymentId,
        transactionId: result.transaction?.id || result.session?.transactionId,
        split: result.session?.split,
        ticket: result.ticket,
        transaction: result.transaction,
        message:
          normalizedStatus === 'succeeded'
            ? 'Paiement confirmé avec succès et split 95/5 reversé.'
            : 'Paiement annulé ou non complété.',
      });
    }

    // Otherwise render high-fidelity HTML receipt page with BGla Mac Gold/Black aesthetic
    const session = result.session;
    const ticket = result.ticket;
    const split = session?.split || {
      totalFCFA: ticket?.priceFCFA || 25000,
      creatorShareFCFA: Math.round((ticket?.priceFCFA || 25000) * 0.95),
      platformFeeFCFA: Math.round((ticket?.priceFCFA || 25000) * 0.05),
      creatorPercent: 95,
      platformPercent: 5,
    };

    const isSuccess = normalizedStatus === 'succeeded';
    const statusColor = isSuccess ? '#10b981' : '#ef4444';
    const statusText = isSuccess ? 'Paiement Réussi & Billet Émis !' : 'Paiement Non Complété';

    const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BGla Mac | Confirmation de Paiement</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0d0d0d;
      color: #f4f4f5;
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #141414;
      border: 1px solid #27272a;
      border-radius: 24px;
      max-width: 540px;
      width: 100%;
      padding: 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(212, 175, 55, 0.1);
      position: relative;
      overflow: hidden;
    }
    .badge-bar {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: ${isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'};
      color: ${statusColor};
      border: 1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
      margin-bottom: 16px;
    }
    h1 {
      font-family: 'Syne', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    p.subtitle {
      color: #a1a1aa;
      font-size: 13px;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .ticket-box {
      background: linear-gradient(180deg, #18181b 0%, #121214 100%);
      border: 1px solid rgba(212, 175, 55, 0.4);
      border-radius: 18px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .ticket-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #27272a;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .ticket-title {
      font-family: 'Syne', sans-serif;
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
    }
    .ticket-tier {
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      background: #D4AF37;
      color: #000;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      font-size: 12px;
    }
    .grid-item {
      background: #202023;
      padding: 10px 12px;
      border-radius: 10px;
    }
    .grid-label {
      color: #71717a;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .grid-val {
      color: #fff;
      font-weight: 700;
      font-size: 12px;
    }
    .split-banner {
      background: #18181a;
      border: 1px solid #27272a;
      border-radius: 14px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 11px;
    }
    .split-title {
      color: #D4AF37;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .split-details {
      display: flex;
      justify-content: space-between;
      color: #a1a1aa;
      font-family: monospace;
      font-size: 11px;
      margin-top: 6px;
    }
    .btn-group {
      display: flex;
      gap: 10px;
    }
    .btn {
      flex: 1;
      padding: 12px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 800;
      text-align: center;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }
    .btn-gold {
      background: #D4AF37;
      color: #000;
    }
    .btn-gold:hover {
      background: #e5c158;
    }
    .btn-dark {
      background: #27272a;
      color: #f4f4f5;
    }
    .btn-dark:hover {
      background: #3f3f46;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge-bar">
      <span>●</span> ${statusText}
    </div>

    <h1>BGla Mac Paiement</h1>
    <p class="subtitle">
      ${
        isSuccess
          ? 'Votre transaction a été validée avec succès. Le split 95/5 a été reversé directement sur le compte de l’artiste.'
          : 'La session de paiement n’a pas abouti ou a été annulée.'
      }
    </p>

    ${
      ticket
        ? `<div class="ticket-box">
        <div class="ticket-header">
          <div>
            <div style="font-size: 10px; color: #D4AF37; font-weight: 800; text-transform: uppercase;">Pass Officiel d'Entrée</div>
            <div class="ticket-title">${ticket.concertTitle || 'Grand Concert Live'}</div>
            <div style="font-size: 11px; color: #71717a;">${ticket.stadiumName} • ${ticket.city}</div>
          </div>
          <span class="ticket-tier">${ticket.tier}</span>
        </div>
        <div class="grid">
          <div class="grid-item">
            <div class="grid-label">Spectateur</div>
            <div class="grid-val">${ticket.buyerName}</div>
          </div>
          <div class="grid-item">
            <div class="grid-label">Porte / Accès</div>
            <div class="grid-val">${ticket.gateNumber}</div>
          </div>
          <div class="grid-item">
            <div class="grid-label">Montant Payé</div>
            <div class="grid-val" style="color: #D4AF37;">${ticket.priceFCFA.toLocaleString('fr-FR')} FCFA</div>
          </div>
          <div class="grid-item">
            <div class="grid-label">Réf. Sécurisée</div>
            <div class="grid-val" style="font-family: monospace; font-size: 10px;">${ticket.transactionRef.slice(0, 15)}...</div>
          </div>
        </div>
      </div>`
        : ''
    }

    <div class="split-banner">
      <div class="split-title">⚡ Certification Split 95/5 Appliqué</div>
      <div class="split-details">
        <span style="color: #10b981;">95% Artiste : ${split.creatorShareFCFA.toLocaleString('fr-FR')} FCFA</span>
        <span style="color: #eab308;">5% BGla Mac : ${split.platformFeeFCFA.toLocaleString('fr-FR')} FCFA</span>
      </div>
    </div>

    <div class="btn-group">
      <a href="/" class="btn btn-gold">Retour à l'Application</a>
      <a href="/payment/status?paymentId=${result.session?.id || paymentId}" class="btn btn-dark">Vérifier Statut</a>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error: any) {
    console.error('[Payment Callback Error]:', error);
    return res.status(500).json({ error: error?.message || 'Erreur callback' });
  }
};

app.get('/payment/callback', handlePaymentCallback);
app.post('/payment/callback', handlePaymentCallback);
app.get('/api/payment/callback', handlePaymentCallback);
app.post('/api/payment/callback', handlePaymentCallback);
app.get('/api/payments/callback', handlePaymentCallback);
app.post('/api/payments/callback', handlePaymentCallback);

// --------------------------------------------------------
// ROUTE 3: /payment/webhook (and /api/payment/webhook, /api/payments/webhook)
// IPN (Instant Payment Notification) listener for Wave, Orange Money, Moov, Stripe, PayPal, CinetPay
// --------------------------------------------------------
const handlePaymentWebhook = (req: express.Request, res: express.Response) => {
  try {
    const payload = req.body || {};
    const headers = req.headers || {};

    // Detect provider
    let provider = 'generic_mobile_money';
    if (headers['stripe-signature']) provider = 'stripe_connect';
    else if (headers['wave-signature'] || payload.wave_id || payload.type?.startsWith('wave.')) provider = 'wave';
    else if (payload.cpm_site_id || payload.cpm_trans_id) provider = 'cinetpay';
    else if (payload.event_type?.startsWith('PAYMENT.')) provider = 'paypal';
    else if (payload.provider) provider = payload.provider;

    // Detect payment or transaction identifier
    const paymentId = (payload.paymentId ||
      payload.data?.object?.id ||
      payload.data?.id ||
      payload.transactionId ||
      payload.transaction_id ||
      payload.cpm_trans_id ||
      payload.token ||
      payload.ref ||
      req.query.paymentId ||
      '') as string;

    // Detect event
    const event = (payload.event ||
      payload.type ||
      payload.event_type ||
      payload.status ||
      'payment.succeeded') as string;

    const isSuccessEvent =
      event.includes('success') ||
      event.includes('completed') ||
      event.includes('ACCEPTED') ||
      event.includes('SUCCEEDED') ||
      payload.status === 'SUCCESS' ||
      payload.cpm_result === '00';

    const isFailedEvent =
      event.includes('failed') ||
      event.includes('cancelled') ||
      event.includes('refunded') ||
      payload.status === 'FAILED';

    let finalizationResult: any = null;
    let logStatus: 'processed' | 'ignored' | 'failed' = 'ignored';

    if (paymentId) {
      if (isSuccessEvent) {
        finalizationResult = dbManager.finalizePaymentSession(paymentId, 'succeeded', payload.reference || payload.id);
        logStatus = 'processed';
      } else if (isFailedEvent) {
        finalizationResult = dbManager.finalizePaymentSession(paymentId, 'failed');
        logStatus = 'processed';
      }
    }

    const log = dbManager.logWebhook(
      provider,
      event,
      payload,
      logStatus,
      paymentId,
      finalizationResult?.transaction?.id
    );

    console.log(`[Webhook IPN] Received ${event} from ${provider} | Target: ${paymentId || 'none'} | Status: ${logStatus}`);

    return res.status(200).json({
      success: true,
      received: true,
      webhookId: log.id,
      event,
      provider,
      paymentId,
      transactionId: finalizationResult?.transaction?.id,
      status: isSuccessEvent ? 'succeeded' : isFailedEvent ? 'failed' : 'recorded',
      splitRule: '95_5',
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Payment Webhook Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur traitement webhook IPN',
    });
  }
};

// GET on webhook returns gateway connectivity status and registered webhook events
const handlePaymentWebhookInfo = (req: express.Request, res: express.Response) => {
  const db = dbManager.getDatabase();
  return res.status(200).json({
    status: 'online',
    endpoint: '/payment/webhook',
    service: 'BGla Mac Instant Payment Notification (IPN) & Webhook Listener',
    supportedGateways: ['wave', 'orange_money', 'moov_money', 'mtn_momo', 'stripe_connect', 'paypal', 'cinetpay'],
    splitPolicy: '95% Net Créateur / 5% Commission Plateforme BGla Mac',
    stats: {
      totalWebhooksLogged: db.webhookLogs?.length || 0,
      recentWebhooks: (db.webhookLogs || []).slice(0, 5),
    },
  });
};

app.post('/payment/webhook', handlePaymentWebhook);
app.get('/payment/webhook', handlePaymentWebhookInfo);
app.post('/api/payment/webhook', handlePaymentWebhook);
app.get('/api/payment/webhook', handlePaymentWebhookInfo);
app.post('/api/payments/webhook', handlePaymentWebhook);
app.get('/api/payments/webhook', handlePaymentWebhookInfo);

// --------------------------------------------------------
// ROUTE 4: /payment/status (and /api/payment/status, /payment/status/:id)
// Query payment status by paymentId, transactionId, or QR hash
// --------------------------------------------------------
const handlePaymentStatus = (req: express.Request, res: express.Response) => {
  try {
    const query = (req.params.id ||
      req.query.paymentId ||
      req.query.transactionId ||
      req.query.id ||
      req.query.ref ||
      req.query.qrHash ||
      req.body?.paymentId ||
      req.body?.transactionId ||
      req.body?.id ||
      '') as string;

    if (!query) {
      // Return global stats and list of recent sessions if no specific ID passed
      const db = dbManager.getDatabase();
      return res.status(200).json({
        success: true,
        message: 'Spécifiez ?paymentId=... ou /payment/status/:id pour vérifier une transaction précise.',
        totalSessions: db.paymentSessions?.length || 0,
        recentSessions: (db.paymentSessions || []).slice(0, 10),
      });
    }

    const result = dbManager.getPaymentStatus(query);

    return res.status(200).json({
      success: true,
      query,
      found: result.found,
      status: result.status,
      amountFCFA: result.amountFCFA,
      provider: result.provider,
      buyerName: result.buyerName,
      buyerPhone: result.buyerPhone,
      split: result.split,
      ticket: result.ticket,
      transaction: result.transaction,
      session: result.session,
      checkedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Payment Status Error]:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Erreur vérification statut paiement',
    });
  }
};

app.get('/payment/status', handlePaymentStatus);
app.post('/payment/status', handlePaymentStatus);
app.get('/payment/status/:id', handlePaymentStatus);
app.get('/api/payment/status', handlePaymentStatus);
app.post('/api/payment/status', handlePaymentStatus);
app.get('/api/payment/status/:id', handlePaymentStatus);
app.get('/api/payments/status', handlePaymentStatus);
app.post('/api/payments/status', handlePaymentStatus);
app.get('/api/payments/status/:id', handlePaymentStatus);

// --------------------------------------------------------
// Legacy checkout endpoint (retained for full backwards compatibility)
// --------------------------------------------------------
app.post('/api/payments/checkout', (req, res) => {
  try {
    const {
      type = 'ticket_purchase',
      creatorId = 'artist-oude-mill',
      amountFCFA,
      paymentProvider = 'stripe_connect',
      buyerName,
      buyerPhone,
      buyerEmail,
      itemDescription,
      concert,
    } = req.body;

    if (!amountFCFA || amountFCFA <= 0) {
      return res.status(400).json({ error: 'Montant invalide en FCFA' });
    }
    if (!buyerName || !buyerPhone) {
      return res.status(400).json({ error: 'Nom et téléphone du payeur requis' });
    }

    const result = dbManager.processPaymentWithSplit({
      type,
      creatorId,
      amountFCFA: Number(amountFCFA),
      paymentProvider,
      buyerName,
      buyerPhone,
      buyerEmail,
      itemDescription: itemDescription || 'Achat de billet BGla Mac',
      concert,
    });

    console.log(`[Payment] Processed ${type} | Total: ${amountFCFA} FCFA | Split: 95% Creator (${result.split.creatorShareFCFA} FCFA) / 5% Platform (${result.split.platformFeeFCFA} FCFA) via ${paymentProvider}`);

    return res.status(200).json({
      success: true,
      message: 'Paiement confirmé avec succès et split 95/5 appliqué.',
      ...result,
    });
  } catch (error: any) {
    console.error('[Payment Error]:', error);
    return res.status(500).json({ error: error?.message || 'Erreur lors du traitement du paiement' });
  }
});

// 2. Get Creator Account details, live balance, Stripe Connect & PayPal status
app.get('/api/creators/:id', (req, res) => {
  try {
    const creator = dbManager.getCreator(req.params.id);
    return res.json({ success: true, creator });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erreur lors de la récupération du créateur' });
  }
});

// 3. Creator Request Payout (Virement vers Stripe Connect / PayPal / Wave)
app.post('/api/creators/:id/payout', (req, res) => {
  try {
    const { amountFCFA, method = 'stripe_connect' } = req.body;
    if (!amountFCFA || Number(amountFCFA) <= 0) {
      return res.status(400).json({ error: 'Montant de virement invalide' });
    }

    const result = dbManager.requestCreatorPayout(
      req.params.id,
      Number(amountFCFA),
      method
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    console.log(`[Payout] Creator ${req.params.id} withdrew ${amountFCFA} FCFA via ${method}`);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erreur lors du virement' });
  }
});

// 4. Renew Artist Subscription (10 000 FCFA / mois)
app.post('/api/subscription/renew', (req, res) => {
  try {
    const { creatorId = 'artist-oude-mill', paymentProvider = 'stripe_connect', buyerName = 'Oude Mill', buyerPhone = '+223 76 00 11 22' } = req.body;

    const result = dbManager.processPaymentWithSplit({
      type: 'artist_subscription',
      creatorId,
      amountFCFA: 10000,
      paymentProvider,
      buyerName,
      buyerPhone,
      itemDescription: 'Abonnement Artiste BGla Mac Pro - 10 000 FCFA/mois',
    });

    return res.json({
      success: true,
      message: 'Abonnement artiste 10 000 FCFA renouvelé avec succès pour 30 jours !',
      ...result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erreur lors du renouvellement' });
  }
});

// 5. Verify Ticket QR Code (Server-side validation against database)
app.post('/api/tickets/verify', (req, res) => {
  try {
    const { qrHash } = req.body;
    if (!qrHash) {
      return res.status(400).json({ error: 'Code QR ou hash manquant' });
    }

    const result = dbManager.verifyTicket(qrHash);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erreur lors de la vérification du billet' });
  }
});

// 6. Punch / Invalidate Ticket at Venue Gate (Prevent reuse)
app.post('/api/tickets/punch', (req, res) => {
  try {
    const { qrHash, scannedBy = 'Agent Scanner Porte Officielle' } = req.body;
    if (!qrHash) {
      return res.status(400).json({ error: 'Code QR manquant' });
    }

    const result = dbManager.punchTicket(qrHash, scannedBy);
    if (!result.success) {
      return res.status(400).json(result);
    }

    console.log(`[Ticket Scanned] ${qrHash} checked in by ${scannedBy}`);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erreur lors du compostage' });
  }
});

// 7. Get Database State & Stats for live architecture flow inspection
app.get('/api/database/state', (req, res) => {
  try {
    const db = dbManager.getDatabase();
    const stats = dbManager.getStats();
    return res.json({
      success: true,
      stats,
      creators: db.creators,
      recentTransactions: db.transactions.slice(0, 15),
      recentTickets: db.tickets.slice(0, 15),
      recentPayouts: db.payouts.slice(0, 10),
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erreur base de données' });
  }
});

// 8. Get Transactions List
app.get('/api/transactions', (req, res) => {
  try {
    const db = dbManager.getDatabase();
    return res.json({
      success: true,
      transactions: db.transactions,
      count: db.transactions.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message });
  }
});

// 9. Get Tickets List
app.get('/api/tickets', (req, res) => {
  try {
    const db = dbManager.getDatabase();
    return res.json({
      success: true,
      tickets: db.tickets,
      count: db.tickets.length,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message });
  }
});

// 10. BGla Tok Short Videos & Montage API
const BGlaTokVideosStore: any[] = [];

app.get('/api/bglatok/videos', (req, res) => {
  return res.json({
    success: true,
    videos: BGlaTokVideosStore,
    count: BGlaTokVideosStore.length,
  });
});

app.post('/api/bglatok/videos', (req, res) => {
  try {
    const newVideo = req.body;
    if (!newVideo || !newVideo.id) {
      return res.status(400).json({ error: 'Données vidéo manquantes' });
    }
    BGlaTokVideosStore.unshift(newVideo);
    console.log(`[BGla Tok] Published video ${newVideo.id} - ${newVideo.description?.slice(0, 30)}`);
    return res.json({ success: true, video: newVideo });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erreur publication vidéo' });
  }
});

app.post('/api/bglatok/videos/:id/like', (req, res) => {
  const { id } = req.params;
  const vid = BGlaTokVideosStore.find((v) => v.id === id);
  if (vid) {
    vid.likesCount = (vid.likesCount || 0) + 1;
    vid.isLiked = true;
    return res.json({ success: true, likesCount: vid.likesCount });
  }
  return res.json({ success: true, id, likesCount: 1 });
});

// Start video generation
app.post('/api/generate-video', async (req, res) => {
  try {
    const { image, prompt, aspectRatio = '9:16', resolution = '720p', model = 'veo-3.1-fast-generate-preview', musicGenre, cameraMovement, cinematicFilter, visualEffects } = req.body;

    if (!prompt && !image) {
      return res.status(400).json({ error: 'Prompt or image is required for video generation.' });
    }

    const ai = getGenAIClient();

    // Prepare configuration
    const validAspectRatio = aspectRatio === '16:9' ? '16:9' : '9:16';
    const configPayload: any = {
      numberOfVideos: 1,
      aspectRatio: validAspectRatio,
    };

    if (resolution) {
      configPayload.resolution = resolution;
    }

    let finalPrompt = prompt || 'Oude Mill performing live in a giant stadium concert with fireworks and ecstatic crowd';
    if (musicGenre && !finalPrompt.toLowerCase().includes(musicGenre.toLowerCase())) {
      finalPrompt += `\n\n[Genre musical & ambiance foule : ${musicGenre}]`;
    }
    if (cameraMovement && !finalPrompt.toLowerCase().includes(cameraMovement.toLowerCase())) {
      finalPrompt += `\n\n[Contrainte cinématique - Mouvement de caméra imposé : ${cameraMovement}]`;
    }
    if (cinematicFilter && !finalPrompt.toLowerCase().includes(cinematicFilter.toLowerCase())) {
      finalPrompt += `\n\n[Post-traitement cinématographique imposé : ${cinematicFilter}]`;
    }
    if (visualEffects) {
      const fxString = Array.isArray(visualEffects) ? visualEffects.join(', ') : visualEffects;
      if (fxString && !finalPrompt.toLowerCase().includes(fxString.toLowerCase())) {
        finalPrompt += `\n\n[Contraintes Effets Visuels de Scène : ${fxString}]`;
      }
    }

    const generatePayload: any = {
      model: model || 'veo-3.1-fast-generate-preview',
      prompt: finalPrompt,
      config: configPayload,
    };

    // If starting image is provided, parse base64
    if (image && typeof image === 'string') {
      let base64Data = image;
      let mimeType = 'image/jpeg';

      if (image.includes(';base64,')) {
        const parts = image.split(';base64,');
        mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        base64Data = parts[1];
      }

      generatePayload.image = {
        imageBytes: base64Data,
        mimeType: mimeType,
      };
    }

    console.log(`[Veo] Initiating video generation with model: ${generatePayload.model}, ratio: ${validAspectRatio}`);
    const operation = await ai.models.generateVideos(generatePayload);

    console.log(`[Veo] Operation started: ${operation.name}`);
    return res.json({
      operationName: operation.name,
      status: 'started',
      model: generatePayload.model,
      aspectRatio: validAspectRatio,
    });
  } catch (error: any) {
    console.error('[Veo] Error generating video:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to start video generation',
      details: error?.statusText || error?.toString(),
    });
  }
});

// Poll video status
app.post('/api/video-status', async (req, res) => {
  try {
    const { operationName } = req.body;
    if (!operationName) {
      return res.status(400).json({ error: 'operationName is required' });
    }

    const ai = getGenAIClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });

    if (updated.error) {
      return res.json({
        done: true,
        error: updated.error.message || JSON.stringify(updated.error),
      });
    }

    const generatedVideo = updated.response?.generatedVideos?.[0];
    const hasVideo = Boolean(generatedVideo?.video?.uri);

    return res.json({
      done: Boolean(updated.done || hasVideo),
      hasVideo,
      metadata: updated.metadata,
    });
  } catch (error: any) {
    console.error('[Veo] Error checking status:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to poll video status',
    });
  }
});

// Video stream/download endpoint
app.get('/api/video-stream', async (req, res) => {
  try {
    const operationName = req.query.operationName as string;
    const customFilename = (req.query.filename as string) || 'oude-mill-concert-veo.mp4';
    const safeFilename = customFilename.endsWith('.mp4') ? customFilename : `${customFilename}.mp4`;

    if (!operationName) {
      return res.status(400).send('operationName query param is required');
    }

    // Handle official clips or demo previews smoothly
    if (operationName.startsWith('official_') || operationName.startsWith('demo_')) {
      const samplePath = path.resolve(__dirname, 'public/sample-oude-mill.mp4');
      if (fs.existsSync(samplePath)) {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        if (req.query.download === 'true') {
          res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        } else {
          res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
        }
        const fileBuffer = await fs.promises.readFile(samplePath);
        return res.send(fileBuffer);
      }
    }

    const ai = getGenAIClient();
    const op = new GenerateVideosOperation();
    op.name = operationName;

    const updated = await ai.operations.getVideosOperation({ operation: op });
    const uri = updated.response?.generatedVideos?.[0]?.video?.uri;

    if (!uri) {
      return res.status(404).send('Generated video URI not found or still rendering.');
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    const videoRes = await fetch(uri, {
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!videoRes.ok) {
      return res.status(videoRes.status).send(`Failed to fetch video: ${videoRes.statusText}`);
    }

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
    }

    const arrayBuffer = await videoRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (error: any) {
    console.error('[Veo] Download error:', error);
    return res.status(500).send(error?.message || 'Failed to stream video');
  }
});

// Prompt enhancer using Gemini Flash
app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const { basePrompt, concertStyle, crowdEnergy, lightingFX, musicGenre, cameraMovement, cinematicFilter, visualEffects } = req.body;
    const ai = getGenAIClient();

    const selectedCameraMove = cameraMovement || 'Slow Zoom In';
    const selectedCinematicFilter = cinematicFilter || 'Grain 35mm (Pellicule argentique Kodak)';
    const selectedVisualFX = Array.isArray(visualEffects)
      ? visualEffects.join(', ')
      : (visualEffects || "Feux d'artifice, Jets de flammes");

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are an elite concert director and cinematic VFX prompt engineer for Google Veo video generation.
Enhance this concert video generation prompt featuring Malian rap icon Oude Mill.
Base user request: ${basePrompt || 'Oude Mill performing in a giant stadium'}
Style: ${concertStyle || 'Massive world stadium headliner'}
Camera Movement Constraint: ${selectedCameraMove}
Cinematic Filter & Color Grading Constraint: ${selectedCinematicFilter}
Stage Visual Effects Constraints: ${selectedVisualFX}
Crowd Energy & Mood: ${crowdEnergy || 'Hundreds of thousands of ecstatic fans'}
Music Genre & Rhythm: ${musicGenre || 'Afro-Rap Malien (130 BPM)'}
Lighting & FX: ${lightingFX || 'Fireworks, lasers, 4K giant screens'}

Requirements:
- Preserve Oude Mill's exact facial likeness and modern street-luxe style.
- Reflect the selected musical genre in the artist's rhythm and gestures, lighting pulses, and crowd behavior (jumping vs swaying vs fist pumping).
- STRICT CONSTRAINT: Enforce the camera movement style: "${selectedCameraMove}". Explicitly describe this exact camera movement choreography.
- STRICT CONSTRAINT: Enforce the cinematic filter post-processing aesthetic: "${selectedCinematicFilter}". Explicitly describe the color grading, film stock grain, lighting halation, and visual post-processing texture.
- STRICT CONSTRAINT: Enforce the specific stage visual effects: "${selectedVisualFX}". Explicitly choreograph their deployment during the show (e.g., synchronous explosions of fireworks in the night sky, massive flame jets firing from the stage edge, metallic gold confetti cannons bursting, and volumetric strobe lasers piercing through the stage fog).
- Realistic, confident walking and mic delivery (no clumsy movement, sharp 4K details).
- Format output as an optimized, vivid cinematic prompt ready for Veo 3.1.
- Output ONLY the refined prompt text in French (the user's preferred language) with no meta-commentary.`,
    });

    res.json({ enhancedPrompt: response.text?.trim() });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to enhance prompt' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Oude Mill Video Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
});
