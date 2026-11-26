import React, { useState } from 'react';
import { Coins, Sparkles, Zap, CheckCircle2, ShieldCheck, CreditCard, Smartphone } from 'lucide-react';
import { useFirebase } from '../../context/FirebaseContext';
import { PaymentProvider } from '../../types';

interface CreditRechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceFCFA: number;
  badge?: string;
  popular?: boolean;
}

const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack-5',
    name: 'Pack Découverte',
    credits: 5,
    priceFCFA: 5000,
    badge: '5 clips Veo',
  },
  {
    id: 'pack-15',
    name: 'Pack Artiste Pro',
    credits: 15,
    priceFCFA: 12000,
    badge: 'Meilleure Valeur',
    popular: true,
  },
  {
    id: 'pack-50',
    name: 'Pack Tournée Stade',
    credits: 50,
    priceFCFA: 35000,
    badge: 'Illimité & VIP',
  },
];

export const CreditRechargeModal: React.FC<CreditRechargeModalProps> = ({ isOpen, onClose }) => {
  const { user, videoCredits, addCredits } = useFirebase();
  const [selectedPack, setSelectedPack] = useState<CreditPack>(CREDIT_PACKS[1]);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>('orange_money');
  const [phoneNumber, setPhoneNumber] = useState('+223 76 00 11 22');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulatePayment = async () => {
    try {
      setIsProcessing(true);
      setSuccessMessage(null);

      // Simulate network transaction delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await addCredits(selectedPack.credits);

      setSuccessMessage(`Paiement simulé réussi ! +${selectedPack.credits} crédits ajoutés à votre compte.`);
      setTimeout(() => {
        setSuccessMessage(null);
        setIsProcessing(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors du rechargement');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#141414] border-2 border-[#D4AF37]/50 rounded-3xl shadow-2xl p-5 sm:p-7 space-y-6">
        <div className="flex items-center justify-between border-b border-[#262626] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#D4AF37] text-black font-extrabold shadow-lg shadow-[#D4AF37]/20">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase font-['Syne',sans-serif]">
                Recharger vos Crédits Vidéo Veo 3.1
              </h3>
              <p className="text-xs text-zinc-400">
                Solde actuel : <strong className="text-[#D4AF37]">{videoCredits} crédits</strong> disponibles
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#222] text-zinc-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {successMessage ? (
          <div className="p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <h4 className="text-base font-black text-white">Rechargement Validé !</h4>
            <p className="text-xs text-emerald-200">{successMessage}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Packs Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                1. Choisissez votre Pack de Crédits :
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CREDIT_PACKS.map((pack) => {
                  const isSelected = selectedPack.id === pack.id;
                  return (
                    <div
                      key={pack.id}
                      onClick={() => setSelectedPack(pack)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all relative ${
                        isSelected
                          ? 'bg-[#201c13] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/25 scale-[1.02]'
                          : 'bg-[#181818] border-[#2c2c2c] hover:border-zinc-600'
                      }`}
                    >
                      {pack.popular && (
                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#D4AF37] text-black text-[9px] font-black uppercase">
                          Populaire
                        </span>
                      )}
                      <div className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">
                        {pack.badge}
                      </div>
                      <div className="text-2xl font-black text-white font-mono mt-1">
                        {pack.credits} <span className="text-xs text-zinc-400">crédits</span>
                      </div>
                      <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
                        {pack.priceFCFA.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                2. Mode de Paiement Mobile Money / Carte :
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: 'orange_money', label: 'Orange', color: 'text-orange-400' },
                  { id: 'wave', label: 'Wave', color: 'text-cyan-400' },
                  { id: 'mtn_momo', label: 'MTN', color: 'text-yellow-400' },
                  { id: 'moov_money', label: 'Moov', color: 'text-blue-400' },
                  { id: 'card', label: 'Carte', color: 'text-purple-400' },
                ].map((prov) => (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => setPaymentProvider(prov.id as PaymentProvider)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentProvider === prov.id
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white font-bold shadow-sm'
                        : 'bg-[#181818] border-[#2a2a2a] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className={`text-xs font-bold ${prov.color}`}>{prov.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 block">
                Numéro de Téléphone Mobile Money (Simulation) :
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+223 76 00 11 22"
                  className="w-full bg-[#101010] border border-[#333] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Summary & Confirm */}
            <div className="pt-3 border-t border-[#262626] flex items-center justify-between gap-4">
              <div>
                <span className="text-xs text-zinc-400 block">Total à régler :</span>
                <span className="text-lg font-black text-white font-mono">
                  {selectedPack.priceFCFA.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="px-6 py-3.5 rounded-xl bg-[#D4AF37] hover:bg-[#e6c148] disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-[#D4AF37]/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>{isProcessing ? 'Validation en cours...' : `Confirmer & Créditer (${selectedPack.credits})`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
