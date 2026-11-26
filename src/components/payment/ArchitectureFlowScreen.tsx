import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Smartphone,
  CreditCard,
  DollarSign,
  ArrowRight,
  ArrowDown,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Send,
  Zap,
  Globe,
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  Terminal,
  Copy,
  Check,
  FileCode,
  Layers,
  Code2,
  Search,
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { CreatorAccountData, PaymentProvider, TransactionItem } from '../../types';

export const ArchitectureFlowScreen: React.FC = () => {
  const [selectedGateway, setSelectedGateway] = useState<PaymentProvider>('stripe_connect');
  const [testAmountFCFA, setTestAmountFCFA] = useState<number>(50000); // 50 000 FCFA (VVIP)
  const [buyerName, setBuyerName] = useState<string>('Amadou Diallo');
  const [buyerPhone, setBuyerPhone] = useState<string>('+223 76 99 88 77');

  const [activeStep, setActiveStep] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [apiLogs, setApiLogs] = useState<string[]>([
    '[INIT] Architecture BGla Mac connectée : Express Backend + Base de données active',
    '[ROUTING] Split 95/5 prêt : 95% Artiste / 5% Commission Plateforme',
    '[ENDPOINTS] 4 Routes Actives : /payment/create, /payment/callback, /payment/webhook, /payment/status',
  ]);

  // Interactive Payment Endpoints Explorer State
  const [activeApiRoute, setActiveApiRoute] = useState<'create' | 'callback' | 'webhook' | 'status'>('create');
  
  // 1. /payment/create state
  const [createForm, setCreateForm] = useState({
    amountFCFA: 25000,
    paymentProvider: 'wave' as PaymentProvider,
    buyerName: 'Moussa Keïta',
    buyerPhone: '+223 76 54 32 10',
    buyerEmail: 'moussa.keita@gmail.com',
    itemDescription: '1x Billet VIP Tribune - Concert Stade du 26-Mars',
  });
  const [createResult, setCreateResult] = useState<any>(null);
  const [createLoading, setCreateLoading] = useState(false);

  // 2. /payment/callback state
  const [callbackId, setCallbackId] = useState('');
  const [callbackStatus, setCallbackStatus] = useState<'success' | 'failed' | 'cancel'>('success');
  const [callbackResult, setCallbackResult] = useState<any>(null);
  const [callbackLoading, setCallbackLoading] = useState(false);

  // 3. /payment/webhook state
  const [webhookProvider, setWebhookProvider] = useState<'wave' | 'orange_money' | 'stripe_connect' | 'paypal' | 'cinetpay'>('wave');
  const [webhookEvent, setWebhookEvent] = useState('wave.payment.succeeded');
  const [webhookTargetId, setWebhookTargetId] = useState('');
  const [webhookResult, setWebhookResult] = useState<any>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);

  // 4. /payment/status state
  const [statusQuery, setStatusQuery] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const [dbState, setDbState] = useState<{
    stats: any;
    creator: CreatorAccountData | null;
    recentTransactions: TransactionItem[];
  }>({
    stats: null,
    creator: null,
    recentTransactions: [],
  });

  const [lastSplitResult, setLastSplitResult] = useState<{
    totalFCFA: number;
    creatorShareFCFA: number;
    platformFeeFCFA: number;
    providerTransactionId: string;
    ticketHash: string;
  } | null>(null);

  // Load real state from server API
  const refreshDbState = async () => {
    try {
      const data = await apiClient.fetchDatabaseState();
      setDbState({
        stats: data.stats,
        creator: data.creators['artist-oude-mill'] || null,
        recentTransactions: data.recentTransactions || [],
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshDbState();
    const interval = setInterval(refreshDbState, 8000);
    return () => clearInterval(interval);
  }, []);

  // Split calculations
  const creatorShareCalc = Math.round((testAmountFCFA * 95) / 100);
  const platformFeeCalc = testAmountFCFA - creatorShareCalc;
  const eurEquivalent = (testAmountFCFA / 655.957).toFixed(2);
  const creatorEur = (creatorShareCalc / 655.957).toFixed(2);
  const platformEur = (platformFeeCalc / 655.957).toFixed(2);

  // Trigger full pipeline simulation across the 5 nodes
  const runSimulation = async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setActiveStep(1);

    const addLog = (msg: string) => {
      setApiLogs((prev) => [msg, ...prev.slice(0, 8)]);
    };

    addLog(`[App Mobile/Web] Envoi requête de paiement : ${testAmountFCFA.toLocaleString('fr-FR')} FCFA via ${selectedGateway.toUpperCase()}`);

    // Step 1: App Mobile/Web -> API Backend
    setTimeout(async () => {
      setActiveStep(2);
      addLog(`[API Backend] Réception POST /api/payments/checkout | Calcul du split 95/5`);

      // Step 2: API Backend -> Base de données
      setTimeout(async () => {
        setActiveStep(3);
        addLog(`[Base de données] Vérification intégrité, attribution quota et sécurisation ticket anti-doublon`);

        // Step 3: Gateway Stripe Connect / PayPal / Mobile Money
        setTimeout(async () => {
          setActiveStep(4);
          addLog(`[${selectedGateway === 'stripe_connect' ? 'Stripe Connect' : selectedGateway === 'paypal' ? 'PayPal Partner' : 'Mobile Money'}] Transfert 95% (${creatorShareCalc.toLocaleString('fr-FR')} FCFA) vers destination créateur`);

          try {
            // Actual Real call to server endpoint
            const res = await apiClient.processCheckout({
              type: 'ticket_purchase',
              creatorId: 'artist-oude-mill',
              amountFCFA: testAmountFCFA,
              paymentProvider: selectedGateway,
              buyerName,
              buyerPhone,
              itemDescription: `Simulation Billet Live (${selectedGateway})`,
              concert: {
                id: 'concert-bko-26mars',
                title: 'Grand Concert Triomphal - World Tour Live',
                artistName: 'Oude Mill',
                stadium: 'Stade du 26-Mars',
                city: 'Bamako',
                country: 'Mali 🇲🇱',
                date: '28 Décembre 2026',
                tier: testAmountFCFA >= 45000 ? 'vvip' : testAmountFCFA >= 20000 ? 'vip' : 'standard',
              },
            });

            // Step 4: Compte Créateur
            setTimeout(() => {
              setActiveStep(5);
              addLog(`[Comptes créateurs] Solde crédité avec succès ! +${res.split.creatorShareFCFA.toLocaleString('fr-FR')} FCFA dispo virement`);

              setLastSplitResult({
                totalFCFA: res.split.totalFCFA,
                creatorShareFCFA: res.split.creatorShareFCFA,
                platformFeeFCFA: res.split.platformFeeFCFA,
                providerTransactionId: res.transaction.providerTransactionId,
                ticketHash: res.ticket?.qrHash || 'BGLAMAC-AUTH-VERIFIED',
              });

              refreshDbState();

              setTimeout(() => {
                setIsSimulating(false);
                setActiveStep(0);
              }, 2500);
            }, 900);
          } catch (err: any) {
            addLog(`[Erreur] ${err?.message || 'Erreur traitement'}`);
            setIsSimulating(false);
            setActiveStep(0);
          }
        }, 900);
      }, 900);
    }, 800);
  };

  // Handlers for the 4 Payment Endpoints
  const handleExecuteCreate = async () => {
    try {
      setCreateLoading(true);
      const res = await apiClient.createPayment({
        amountFCFA: Number(createForm.amountFCFA),
        paymentProvider: createForm.paymentProvider,
        buyerName: createForm.buyerName,
        buyerPhone: createForm.buyerPhone,
        buyerEmail: createForm.buyerEmail,
        itemDescription: createForm.itemDescription,
        concert: {
          id: 'concert-bko-26mars',
          title: 'Grand Concert Triomphal - World Tour Live',
          artistName: 'Oude Mill',
          stadium: 'Stade du 26-Mars',
          city: 'Bamako',
          country: 'Mali 🇲🇱',
          date: '28 Décembre 2026',
          tier: createForm.amountFCFA >= 45000 ? 'vvip' : createForm.amountFCFA >= 20000 ? 'vip' : 'standard',
        },
      });

      setCreateResult(res);
      if (res.paymentId) {
        setCallbackId(res.paymentId);
        setWebhookTargetId(res.paymentId);
        setStatusQuery(res.paymentId);
      }
      setApiLogs((prev) => [
        `[POST /payment/create] Session ${res.paymentId} créée | ${res.amountFCFA} FCFA (${res.provider}) | Split: ${res.split.creatorShareFCFA} FCFA (95% Artiste)`,
        ...prev.slice(0, 7),
      ]);
      refreshDbState();
    } catch (e: any) {
      setCreateResult({ error: e?.message || 'Erreur création session' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleExecuteCallback = async (mode: 'json' | 'html') => {
    try {
      setCallbackLoading(true);
      const target = callbackId.trim() || createResult?.paymentId || 'pay_latest';
      if (mode === 'html') {
        window.open(`/payment/callback?paymentId=${encodeURIComponent(target)}&status=${callbackStatus}`, '_blank');
        setCallbackResult({
          status: 'opened_html',
          info: `Page de reçu officiel ouverte : /payment/callback?paymentId=${target}&status=${callbackStatus}`,
        });
        refreshDbState();
        return;
      }

      const res = await fetch(`/payment/callback?paymentId=${encodeURIComponent(target)}&status=${callbackStatus}&format=json`);
      const data = await res.json();
      setCallbackResult(data);
      setApiLogs((prev) => [
        `[GET /payment/callback] Finalisé ${target} avec statut: ${callbackStatus} | Billet: ${data.ticket?.id || 'N/A'}`,
        ...prev.slice(0, 7),
      ]);
      refreshDbState();
    } catch (e: any) {
      setCallbackResult({ error: e?.message });
    } finally {
      setCallbackLoading(false);
    }
  };

  const handleExecuteWebhook = async () => {
    try {
      setWebhookLoading(true);
      const target = webhookTargetId.trim() || callbackId || createResult?.paymentId || 'pay_session_test';
      const payload = {
        event: webhookEvent,
        provider: webhookProvider,
        paymentId: target,
        status: webhookEvent.includes('success') ? 'SUCCESS' : 'FAILED',
        reference: `WH-${webhookProvider.toUpperCase()}-${Date.now()}`,
        data: {
          id: target,
          amount: 25000,
          currency: 'XOF',
          split: '95_5',
        },
      };

      const res = await apiClient.sendWebhookEvent(payload);
      setWebhookResult(res);
      setApiLogs((prev) => [
        `[POST /payment/webhook] Reçu ${webhookEvent} via ${webhookProvider} | Résultat: ${res.status}`,
        ...prev.slice(0, 7),
      ]);
      refreshDbState();
    } catch (e: any) {
      setWebhookResult({ error: e?.message });
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleExecuteStatus = async () => {
    try {
      setStatusLoading(true);
      const query = statusQuery.trim() || webhookTargetId || callbackId || createResult?.paymentId || '';
      const res = await apiClient.getPaymentStatus(query);
      setStatusResult(res);
      setApiLogs((prev) => [
        `[GET /payment/status] Requête "${query}" -> Statut: ${res.status} | Trouvé: ${res.found}`,
        ...prev.slice(0, 7),
      ]);
    } catch (e: any) {
      setStatusResult({ error: e?.message });
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#181818] via-[#121212] to-[#0d0d0d] border border-[#2a2a2a] relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              Architecture Financière & Technique BGla Mac
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight font-['Syne',sans-serif]">
              Flux de Paiement & Split 95/5 Automatisé
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Exécution temps réel du flux officiel : application mobile/web vers l'API Backend, persistance en base de données, routage Stripe Connect / PayPal / Mobile Money avec reversement direct de <span className="text-[#D4AF37] font-bold">95% aux créateurs</span> et <span className="text-zinc-300 font-bold">5% de frais de plateforme</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshDbState}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-zinc-300 hover:text-white text-xs font-bold transition-all shrink-0 self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-[#D4AF37]" />
            Actualiser Données Live
          </button>
        </div>
      </div>

      {/* ========================================================
          VISUAL ARCHITECTURE PIPELINE (The User's Diagram Rendered)
          [App Mobile/Web] -> [API Backend] -> [Base de données]
                                   ↓
                         [Stripe Connect / PayPal]
                         (paiements + split 95/5)
                                   ↓
                         [Comptes créateurs]
          ======================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#141414] border border-[#262626] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222] pb-4">
          <div>
            <h2 className="text-lg font-black text-white uppercase font-['Syne',sans-serif] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              Diagramme Architectural Actif
            </h2>
            <p className="text-xs text-zinc-400">
              Visualisez le trajet de chaque centime et chaque donnée d'une transaction.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Backend Express & DB Connectés
          </div>
        </div>

        {/* The 5 Interactive Nodes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Node 1: App Mobile/Web */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 relative ${
              activeStep === 1
                ? 'bg-[#1e1b12] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/20 scale-[1.02]'
                : 'bg-[#181818] border-[#2a2a2a] hover:border-[#383838]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase">
                Étape 1
              </span>
              <Smartphone className={`w-5 h-5 ${activeStep === 1 ? 'text-[#D4AF37]' : 'text-zinc-500'}`} />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne',sans-serif] mb-1">
              [App Mobile / Web]
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Interface Android PWA & Web réactive. Sélection du billet (Std, VIP, VVIP) ou abonnement, capture sécurisée des coordonnées client.
            </p>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-zinc-300">
              Payload: {testAmountFCFA.toLocaleString('fr-FR')} FCFA ({selectedGateway})
            </div>
          </div>

          {/* Node 2: API Backend */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 relative ${
              activeStep === 2
                ? 'bg-[#1e1b12] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/20 scale-[1.02]'
                : 'bg-[#181818] border-[#2a2a2a] hover:border-[#383838]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase">
                Étape 2
              </span>
              <Server className={`w-5 h-5 ${activeStep === 2 ? 'text-[#D4AF37]' : 'text-zinc-500'}`} />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne',sans-serif] mb-1">
              [API Backend]
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Routes Express (<code className="text-[#D4AF37]">/api/payments/*</code>). Validation serveur, calcul certifié du split 95/5 et orchestration.
            </p>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-zinc-300 space-y-1">
              <div>Rule: split_95_5_standard</div>
              <div className="text-emerald-400">95% = {creatorShareCalc.toLocaleString('fr-FR')} FCFA</div>
              <div className="text-amber-400">5% = {platformFeeCalc.toLocaleString('fr-FR')} FCFA</div>
            </div>
          </div>

          {/* Node 3: Base de données */}
          <div
            className={`p-5 rounded-2xl border transition-all duration-300 relative ${
              activeStep === 3
                ? 'bg-[#1e1b12] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/20 scale-[1.02]'
                : 'bg-[#181818] border-[#2a2a2a] hover:border-[#383838]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400 uppercase">
                Étape 3
              </span>
              <Database className={`w-5 h-5 ${activeStep === 3 ? 'text-[#D4AF37]' : 'text-zinc-500'}`} />
            </div>
            <h3 className="text-base font-bold text-white font-['Syne',sans-serif] mb-1">
              [Base de données]
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
              Stockage persistant (<code className="text-zinc-300">bgla_mac_db.json</code>). Registre des transactions, quotas de billets, hash QR unique et anti-doublon.
            </p>
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-zinc-300 flex justify-between">
              <span>Billets: {dbState.stats?.totalTickets || 0}</span>
              <span>Tx: {dbState.stats?.totalTransactions || 0}</span>
            </div>
          </div>
        </div>

        {/* Downward Routing Branches */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#222]">
          {/* Node 4: Stripe Connect / PayPal (Split 95/5) */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 relative ${
              activeStep === 4
                ? 'bg-[#1e1b12] border-[#D4AF37] shadow-xl shadow-[#D4AF37]/20 scale-[1.02]'
                : 'bg-[#181818] border-[#2a2a2a] hover:border-[#383838]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase">
                Étape 4 : Passerelle Paiement & Split
              </span>
              <CreditCard className={`w-5 h-5 ${activeStep === 4 ? 'text-[#D4AF37]' : 'text-purple-400'}`} />
            </div>
            <h3 className="text-lg font-bold text-white font-['Syne',sans-serif] mb-1">
              [Stripe Connect / PayPal / Mobile Money]
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Règlement carte bancaire internationale via Stripe Connect (compte connecté express de l'artiste) ou PayPal Payouts, avec reversement automatisé du split 95/5.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/20">
                <div className="text-[10px] uppercase font-bold text-emerald-400">Part Créateur (95%)</div>
                <div className="text-base font-extrabold text-white mt-0.5 font-['Syne',sans-serif]">
                  {creatorShareCalc.toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-[10px] text-zinc-400">≈ {creatorEur} EUR</div>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-amber-500/20">
                <div className="text-[10px] uppercase font-bold text-amber-400">Frais Plateforme (5%)</div>
                <div className="text-base font-extrabold text-white mt-0.5 font-['Syne',sans-serif]">
                  {platformFeeCalc.toLocaleString('fr-FR')} FCFA
                </div>
                <div className="text-[10px] text-zinc-400">≈ {platformEur} EUR</div>
              </div>
            </div>
          </div>

          {/* Node 5: Comptes créateurs */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-300 relative ${
              activeStep === 5
                ? 'bg-[#1e1b12] border-emerald-500 shadow-xl shadow-emerald-500/20 scale-[1.02]'
                : 'bg-[#181818] border-[#2a2a2a] hover:border-[#383838]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase">
                Étape 5 : Réception Créateur
              </span>
              <DollarSign className={`w-5 h-5 ${activeStep === 5 ? 'text-emerald-400' : 'text-zinc-500'}`} />
            </div>
            <h3 className="text-lg font-bold text-white font-['Syne',sans-serif] mb-1">
              [Comptes créateurs]
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              L'artiste ({dbState.creator?.name || 'Oude Mill'}) reçoit immédiatement ses 95% nets sur son compte Stripe Connect (<code className="text-zinc-300">{dbState.creator?.stripeConnect.accountId || 'acct_1OuDeMiLL955BKO'}</code>), PayPal ou son portefeuille Mobile Money.
            </p>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-emerald-400 uppercase font-bold">Solde Disponible Créateur</div>
                <div className="text-lg font-black text-white font-['Syne',sans-serif]">
                  {dbState.creator?.balanceFCFA?.toLocaleString('fr-FR') || '3 825 000'} FCFA
                </div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Prêt à Virer
                </span>
                <div className="text-[10px] text-zinc-400 mt-0.5">Virement instantané</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          SIMULATEUR DE TRANSACTION LIVE & LOGS DU SERVEUR
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-[#141414] border border-[#262626] space-y-5">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <h3 className="text-base font-bold text-white font-['Syne',sans-serif]">
              Simulateur de Paiement 95/5
            </h3>
            <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
              Test Réel via Backend API
            </span>
          </div>

          {/* Amount selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">
              Montant du Billet / Transaction (FCFA)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTestAmountFCFA(10000)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  testAmountFCFA === 10000
                    ? 'bg-[#D4AF37] text-black font-extrabold'
                    : 'bg-[#1c1c1c] text-zinc-400 hover:text-white border border-[#2c2c2c]'
                }`}
              >
                10k Standard
              </button>
              <button
                type="button"
                onClick={() => setTestAmountFCFA(25000)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  testAmountFCFA === 25000
                    ? 'bg-[#D4AF37] text-black font-extrabold'
                    : 'bg-[#1c1c1c] text-zinc-400 hover:text-white border border-[#2c2c2c]'
                }`}
              >
                25k VIP
              </button>
              <button
                type="button"
                onClick={() => setTestAmountFCFA(50000)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  testAmountFCFA === 50000
                    ? 'bg-[#D4AF37] text-black font-extrabold'
                    : 'bg-[#1c1c1c] text-zinc-400 hover:text-white border border-[#2c2c2c]'
                }`}
              >
                50k VVIP
              </button>
            </div>
            <input
              type="number"
              value={testAmountFCFA}
              onChange={(e) => setTestAmountFCFA(Math.max(1000, Number(e.target.value)))}
              className="w-full mt-2 px-3 py-2 rounded-xl bg-[#1c1c1c] border border-[#2c2c2c] text-white text-sm focus:border-[#D4AF37] focus:outline-none"
              placeholder="Montant personnalisé en FCFA"
            />
          </div>

          {/* Payment gateway selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">
              Passerelle de Paiement
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedGateway('stripe_connect')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedGateway === 'stripe_connect'
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white font-bold'
                    : 'bg-[#1c1c1c] border-[#2c2c2c] text-zinc-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Stripe Connect</span>
                  <span className="text-[10px] text-[#D4AF37]">95/5</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Carte Visa/Mastercard</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedGateway('paypal')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedGateway === 'paypal'
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white font-bold'
                    : 'bg-[#1c1c1c] border-[#2c2c2c] text-zinc-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>PayPal</span>
                  <span className="text-[10px] text-[#D4AF37]">95/5</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Marketplace Payouts</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedGateway('wave')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedGateway === 'wave'
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white font-bold'
                    : 'bg-[#1c1c1c] border-[#2c2c2c] text-zinc-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Wave Mali</span>
                  <span className="text-[10px] text-cyan-400">Direct</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Mobile Money instantané</div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedGateway('orange_money')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedGateway === 'orange_money'
                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white font-bold'
                    : 'bg-[#1c1c1c] border-[#2c2c2c] text-zinc-400'
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>Orange Money</span>
                  <span className="text-[10px] text-orange-400">*144#</span>
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Mali & Sous-région</div>
              </button>
            </div>
          </div>

          {/* Buyer inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400">Nom du payeur</label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-xl bg-[#1c1c1c] border border-[#2c2c2c] text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400">Téléphone</label>
              <input
                type="text"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 rounded-xl bg-[#1c1c1c] border border-[#2c2c2c] text-white text-xs"
              />
            </div>
          </div>

          {/* Trigger button */}
          <button
            type="button"
            disabled={isSimulating}
            onClick={runSimulation}
            className={`w-full py-3.5 px-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isSimulating
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#D4AF37] via-amber-300 to-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.01]'
            }`}
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-zinc-500" />
                Traitement en cours (Étape {activeStep}/5)...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Lancer le Flux Réel (Split 95/5)
              </>
            )}
          </button>
        </div>

        {/* Live Logs & Split Proof Column */}
        <div className="lg:col-span-7 space-y-4">
          {/* Last Split Result Card */}
          {lastSplitResult && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#161616] to-[#121212] border border-emerald-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Transaction Certifiée en Base de Données
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {lastSplitResult.providerTransactionId}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-emerald-500/20 text-xs">
                <div>
                  <div className="text-[10px] text-zinc-400">Total Encaissé</div>
                  <div className="font-extrabold text-white text-sm">
                    {lastSplitResult.totalFCFA.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-emerald-400">Artiste (95%)</div>
                  <div className="font-extrabold text-emerald-300 text-sm">
                    +{lastSplitResult.creatorShareFCFA.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-400">Plateforme (5%)</div>
                  <div className="font-extrabold text-amber-300 text-sm">
                    +{lastSplitResult.platformFeeFCFA.toLocaleString('fr-FR')} FCFA
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Console Output */}
          <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-[#222] font-mono text-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222]">
              <span className="text-[11px] text-zinc-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Journal des Événements Serveur (Live API Stream)
              </span>
              <span className="text-[10px] text-zinc-500">Node Express Port 3000</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
              {apiLogs.map((log, index) => (
                <div
                  key={index}
                  className={`leading-relaxed text-[11px] ${
                    index === 0
                      ? 'text-[#D4AF37] font-semibold'
                      : log.includes('Erreur')
                      ? 'text-red-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Global Platform Counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626]">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">Volume Total Brut</div>
              <div className="text-base font-extrabold text-white mt-1 font-['Syne',sans-serif]">
                {dbState.stats?.totalGrossFCFA?.toLocaleString('fr-FR') || '6 850 000'} FCFA
              </div>
              <div className="text-[10px] text-zinc-500">100% encaissé</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626]">
              <div className="text-[10px] text-emerald-400 font-bold uppercase">Reversé Créateurs</div>
              <div className="text-base font-extrabold text-emerald-400 mt-1 font-['Syne',sans-serif]">
                {dbState.stats?.totalCreatorSharesFCFA?.toLocaleString('fr-FR') || '6 507 500'} FCFA
              </div>
              <div className="text-[10px] text-emerald-600">95% net reversé</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#141414] border border-[#262626]">
              <div className="text-[10px] text-amber-400 font-bold uppercase">Commission BGla Mac</div>
              <div className="text-base font-extrabold text-amber-400 mt-1 font-['Syne',sans-serif]">
                {dbState.stats?.totalPlatformFeesFCFA?.toLocaleString('fr-FR') || '342 500'} FCFA
              </div>
              <div className="text-[10px] text-amber-600">5% plateforme</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          CONSOLE INTERACTIVE DES 4 ROUTES DE PAIEMENT
          /payment/create  |  /payment/callback  |  /payment/webhook  |  /payment/status
          ======================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#141414] border border-[#262626] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222] pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold uppercase font-mono">
              <Terminal className="w-3.5 h-3.5" />
              REST API Explorer & Passerelle
            </div>
            <h2 className="text-xl font-black text-white uppercase font-['Syne',sans-serif]">
              Console Interactive des 4 Routes de Paiement
            </h2>
            <p className="text-xs text-zinc-400">
              Testez et inspectez directement les 4 endpoints officiels de paiement, leurs payloads cURL et les réponses du serveur.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
              Sessions: <strong className="text-white">{dbState.stats?.totalSessions || 0}</strong>
            </span>
            <span className="text-[10px] font-mono text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800">
              Webhooks: <strong className="text-emerald-400">{dbState.stats?.totalWebhooks || 0}</strong>
            </span>
          </div>
        </div>

        {/* 4 Endpoints Navigation Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { id: 'create', label: 'POST /payment/create', desc: 'Création de Session' },
            { id: 'callback', label: 'GET /payment/callback', desc: 'Retour Passerelle' },
            { id: 'webhook', label: 'POST /payment/webhook', desc: 'IPN & Notifications' },
            { id: 'status', label: 'GET /payment/status', desc: 'Vérification Statut' },
          ].map((tab) => {
            const isActive = activeApiRoute === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveApiRoute(tab.id as any)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#1e1b12] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/15'
                    : 'bg-[#181818] border-[#262626] hover:border-[#383838]'
                }`}
              >
                <div className={`text-xs font-mono font-bold ${isActive ? 'text-[#D4AF37]' : 'text-zinc-300'}`}>
                  {tab.label}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{tab.desc}</div>
              </button>
            );
          })}
        </div>

        {/* TAB 1: /payment/create */}
        {activeApiRoute === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4 bg-[#181818] p-5 rounded-2xl border border-[#2a2a2a]">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                    POST
                  </span>
                  /payment/create
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `curl -X POST "http://localhost:3000/payment/create" \\
  -H "Content-Type: application/json" \\
  -d '{"amountFCFA": ${createForm.amountFCFA}, "paymentProvider": "${createForm.paymentProvider}", "buyerName": "${createForm.buyerName}", "buyerPhone": "${createForm.buyerPhone}"}'`,
                      'curl-create'
                    )
                  }
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
                >
                  {copiedKey === 'curl-create' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'curl-create' ? 'Copié' : 'Copier cURL'}</span>
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Montant (FCFA) *</label>
                  <input
                    type="number"
                    value={createForm.amountFCFA}
                    onChange={(e) => setCreateForm({ ...createForm, amountFCFA: Number(e.target.value) })}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Moyen de paiement</label>
                  <select
                    value={createForm.paymentProvider}
                    onChange={(e) => setCreateForm({ ...createForm, paymentProvider: e.target.value as any })}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="wave">Wave (Mali & CI - Application Mobile)</option>
                    <option value="orange_money">Orange Money (*144# USSD)</option>
                    <option value="moov_money">Moov Africa Money (*166#)</option>
                    <option value="stripe_connect">Stripe Connect (Carte Bancaire 95/5)</option>
                    <option value="paypal">PayPal (Marketplace Split)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Nom du client *</label>
                    <input
                      type="text"
                      value={createForm.buyerName}
                      onChange={(e) => setCreateForm({ ...createForm, buyerName: e.target.value })}
                      className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Téléphone *</label>
                    <input
                      type="text"
                      value={createForm.buyerPhone}
                      onChange={(e) => setCreateForm({ ...createForm, buyerPhone: e.target.value })}
                      className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Description</label>
                  <input
                    type="text"
                    value={createForm.itemDescription}
                    onChange={(e) => setCreateForm({ ...createForm, itemDescription: e.target.value })}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={createLoading}
                onClick={handleExecuteCreate}
                className="w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e0bc45] text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {createLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Exécuter POST /payment/create</span>
              </button>
            </div>

            {/* Live Response Panel */}
            <div className="lg:col-span-6 bg-[#0f0f0f] p-5 rounded-2xl border border-[#262626] font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#222] pb-2 mb-3">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    Réponse HTTP 201 Created
                  </span>
                  {createResult && (
                    <span className="text-[10px] text-zinc-500">{createResult.paymentId}</span>
                  )}
                </div>

                {createResult ? (
                  <pre className="text-[11px] text-emerald-400 overflow-x-auto p-3 bg-black/60 rounded-xl max-h-72 leading-relaxed">
                    {JSON.stringify(createResult, null, 2)}
                  </pre>
                ) : (
                  <div className="text-zinc-600 italic text-center py-16">
                    Cliquez sur "Exécuter POST /payment/create" pour initialiser une session de paiement et observer la réponse JSON.
                  </div>
                )}
              </div>

              {createResult && (
                <div className="mt-4 pt-3 border-t border-[#222] flex items-center justify-between text-xs font-sans">
                  <span className="text-[11px] text-zinc-400">Routage automatique vers les autres tests :</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCallbackId(createResult.paymentId);
                        setActiveApiRoute('callback');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 hover:text-white text-[11px]"
                    >
                      Tester Callback
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStatusQuery(createResult.paymentId);
                        setActiveApiRoute('status');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30 text-[11px]"
                    >
                      Vérifier Statut
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: /payment/callback */}
        {activeApiRoute === 'callback' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4 bg-[#181818] p-5 rounded-2xl border border-[#2a2a2a]">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                    GET / POST
                  </span>
                  /payment/callback
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `curl "http://localhost:3000/payment/callback?paymentId=${callbackId || 'pay_latest'}&status=${callbackStatus}&format=json"`,
                      'curl-callback'
                    )
                  }
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
                >
                  {copiedKey === 'curl-callback' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'curl-callback' ? 'Copié' : 'Copier cURL'}</span>
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                Point d'atterrissage du client après paiement sur la passerelle. Finalise la transaction, émet le billet officiel et applique le reversement 95/5.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    ID de session ou Transaction (paymentId)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: pay_1729000000_abc ou laissez vide pour la plus récente"
                    value={callbackId}
                    onChange={(e) => setCallbackId(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Statut retourné par la passerelle</label>
                  <select
                    value={callbackStatus}
                    onChange={(e) => setCallbackStatus(e.target.value as any)}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="success">success (Paiement validé par le client)</option>
                    <option value="failed">failed (Fonds insuffisants / échec)</option>
                    <option value="cancel">cancel (Abandon par l'utilisateur)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={callbackLoading}
                  onClick={() => handleExecuteCallback('json')}
                  className="py-2.5 rounded-xl bg-[#2a2a2a] hover:bg-[#383838] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Code2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Tester Callback (JSON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteCallback('html')}
                  className="py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e0bc45] text-black font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ouvrir Reçu (HTML)</span>
                </button>
              </div>
            </div>

            {/* Live Callback Response */}
            <div className="lg:col-span-6 bg-[#0f0f0f] p-5 rounded-2xl border border-[#262626] font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#222] pb-2 mb-3">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Réponse Callback
                  </span>
                </div>

                {callbackResult ? (
                  <pre className="text-[11px] text-cyan-300 overflow-x-auto p-3 bg-black/60 rounded-xl max-h-72 leading-relaxed">
                    {JSON.stringify(callbackResult, null, 2)}
                  </pre>
                ) : (
                  <div className="text-zinc-600 italic text-center py-16">
                    Cliquez sur "Tester Callback" ou "Ouvrir Reçu" pour exécuter le retour de paiement.
                  </div>
                )}
              </div>

              {callbackResult?.ticket && (
                <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl font-sans flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Billet Officiel Émis</div>
                    <div className="text-[10px] text-zinc-400 font-mono">{callbackResult.ticket.qrHash}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    VALIDÉ
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: /payment/webhook */}
        {activeApiRoute === 'webhook' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4 bg-[#181818] p-5 rounded-2xl border border-[#2a2a2a]">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono text-[10px] font-bold">
                    POST
                  </span>
                  /payment/webhook
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `curl -X POST "http://localhost:3000/payment/webhook" \\
  -H "Content-Type: application/json" \\
  -d '{"event": "${webhookEvent}", "provider": "${webhookProvider}", "paymentId": "${webhookTargetId || 'pay_latest'}"}'`,
                      'curl-webhook'
                    )
                  }
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
                >
                  {copiedKey === 'curl-webhook' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'curl-webhook' ? 'Copié' : 'Copier cURL'}</span>
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                IPN (Instant Payment Notification) serveur-à-serveur appelé par Wave, Orange Money, CinetPay, Stripe ou PayPal pour notifier le règlement asynchrone.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Passerelle émettrice</label>
                  <select
                    value={webhookProvider}
                    onChange={(e) => {
                      const p = e.target.value as any;
                      setWebhookProvider(p);
                      if (p === 'wave') setWebhookEvent('wave.payment.succeeded');
                      else if (p === 'stripe_connect') setWebhookEvent('checkout.session.completed');
                      else if (p === 'orange_money') setWebhookEvent('orange_money.transaction.success');
                      else if (p === 'paypal') setWebhookEvent('PAYMENT.CAPTURE.COMPLETED');
                      else setWebhookEvent('cinetpay.notification.success');
                    }}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="wave">Wave Webhook IPN</option>
                    <option value="orange_money">Orange Money IPN Notification</option>
                    <option value="stripe_connect">Stripe Connect Webhook Event</option>
                    <option value="paypal">PayPal Partner Webhook</option>
                    <option value="cinetpay">CinetPay IPN Gateway</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Nom de l'événement webhook</label>
                  <input
                    type="text"
                    value={webhookEvent}
                    onChange={(e) => setWebhookEvent(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    ID cible de paiement (paymentId ou transactionId)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: pay_1729000000_abc"
                    value={webhookTargetId}
                    onChange={(e) => setWebhookTargetId(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={webhookLoading}
                onClick={handleExecuteWebhook}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {webhookLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Radio className="w-3.5 h-3.5" />
                )}
                <span>Simuler l'envoi du Webhook IPN</span>
              </button>
            </div>

            {/* Live Webhook Result */}
            <div className="lg:col-span-6 bg-[#0f0f0f] p-5 rounded-2xl border border-[#262626] font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#222] pb-2 mb-3">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    Réponse Webhook Listener (HTTP 200)
                  </span>
                </div>

                {webhookResult ? (
                  <pre className="text-[11px] text-purple-300 overflow-x-auto p-3 bg-black/60 rounded-xl max-h-72 leading-relaxed">
                    {JSON.stringify(webhookResult, null, 2)}
                  </pre>
                ) : (
                  <div className="text-zinc-600 italic text-center py-16">
                    Cliquez sur "Simuler l'envoi du Webhook IPN" pour tester la réception asynchrone de la passerelle.
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-[#222] flex items-center justify-between text-[11px] font-sans text-zinc-400">
                <span>Vérification automatique :</span>
                <span className="text-emerald-400 font-bold">Split 95/5 & Enregistrement en base de données</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: /payment/status */}
        {activeApiRoute === 'status' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4 bg-[#181818] p-5 rounded-2xl border border-[#2a2a2a]">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                    GET
                  </span>
                  /payment/status
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `curl "http://localhost:3000/payment/status?paymentId=${statusQuery || 'pay_latest'}"`,
                      'curl-status'
                    )
                  }
                  className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white"
                >
                  {copiedKey === 'curl-status' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'curl-status' ? 'Copié' : 'Copier cURL'}</span>
                </button>
              </div>

              <p className="text-xs text-zinc-400">
                Interrogation en temps réel du statut d’une session, d’un paiement ou d’un billet électronique via son identifiant unique ou son hash QR.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Identifiant à inspecter (paymentId, transactionId ou qrHash)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: pay_... ou tx_... ou BGLAMAC-AUTH-..."
                    value={statusQuery}
                    onChange={(e) => setStatusQuery(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2e2e2e] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={statusLoading}
                onClick={handleExecuteStatus}
                className="w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e0bc45] text-black font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {statusLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>Interroger GET /payment/status</span>
              </button>
            </div>

            {/* Live Status Result */}
            <div className="lg:col-span-6 bg-[#0f0f0f] p-5 rounded-2xl border border-[#262626] font-mono text-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#222] pb-2 mb-3">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Statut en Base de Données
                  </span>
                  {statusResult && (
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        statusResult.status === 'succeeded'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : statusResult.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {statusResult.status}
                    </span>
                  )}
                </div>

                {statusResult ? (
                  <pre className="text-[11px] text-amber-300 overflow-x-auto p-3 bg-black/60 rounded-xl max-h-72 leading-relaxed">
                    {JSON.stringify(statusResult, null, 2)}
                  </pre>
                ) : (
                  <div className="text-zinc-600 italic text-center py-16">
                    Saisissez un identifiant ou cliquez sur "Interroger" pour vérifier le statut live.
                  </div>
                )}
              </div>

              {statusResult?.split && (
                <div className="mt-4 p-3 bg-[#161616] border border-[#2a2a2a] rounded-xl font-sans flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Split Appliqué :</span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-400 font-bold">
                      95% Artiste ({statusResult.split.creatorShareFCFA?.toLocaleString('fr-FR')} FCFA)
                    </span>
                    <span>•</span>
                    <span className="text-amber-400">
                      5% ({statusResult.split.platformFeeFCFA?.toLocaleString('fr-FR')} FCFA)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
