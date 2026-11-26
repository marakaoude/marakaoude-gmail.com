import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, Sparkles, User as UserIcon, CheckCircle } from 'lucide-react';
import { FanReview } from '../types';
import { useFirebase } from '../context/FirebaseContext';
import { saveFanReviewToFirestore, subscribeFanReviews } from '../services/firestoreService';

export const FanReviewsSection: React.FC = () => {
  const { user, isAuthReady, signIn } = useFirebase();
  const [reviews, setReviews] = useState<FanReview[]>([]);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeFanReviews((data) => {
      setReviews(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user || !user.emailVerified) {
      setErrorMsg('Veuillez vous connecter avec Google pour laisser un avis.');
      return;
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      setErrorMsg('Veuillez saisir un commentaire.');
      return;
    }

    if (trimmed.length > 1000) {
      setErrorMsg('Le commentaire ne peut pas dépasser 1000 caractères.');
      return;
    }

    try {
      setIsSubmitting(true);
      await saveFanReviewToFirestore(
        user.uid,
        user.displayName || 'Fan BGla Mac',
        user.photoURL || undefined,
        rating,
        trimmed
      );
      setComment('');
      setRating(5);
      setSuccessMsg('Votre avis a été publié avec succès !');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement de votre avis.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <section className="bg-[#1D1D1D] rounded-[16px] border border-[#2C2C2C] p-5 sm:p-7 shadow-2xl relative overflow-hidden space-y-6">
      <div className="absolute top-0 right-0 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#2C2C2C] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-['Syne',sans-serif]">
                Avis de Fans & Communauté
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#D4AF37] text-black tracking-wide">
                BGla Mac
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Partagez vos impressions sur les concerts générés par Veo 3.1
            </p>
          </div>
        </div>

        {/* Global Rating Stats */}
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-black text-white">{averageRating}</span>
          </div>
          <span className="text-xs text-zinc-400">({reviews.length} avis vérifiés)</span>
        </div>
      </div>

      {/* Submission Form */}
      {isAuthReady && user && user.emailVerified ? (
        <form onSubmit={handleSubmitReview} className="p-4 sm:p-5 rounded-2xl bg-[#141414] border border-[#262626] space-y-4 shadow-inner">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profil'}
                  className="w-5 h-5 rounded-full object-cover border border-[#D4AF37]/50"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                  <UserIcon className="w-3 h-3" />
                </div>
              )}
              <span>Laisser un avis en tant que <strong className="text-[#D4AF37]">{user.displayName || 'Fan'}</strong></span>
            </span>

            {/* Star Rating Selector */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-amber-400 hover:scale-125 transition-transform cursor-pointer"
                  title={`${star} sur 5 étoiles`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= (hoverRating || rating)
                        ? 'fill-current text-amber-400'
                        : 'text-zinc-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: Incroyable performance d'Oude Mill ! Les feux d'artifice et l'ambiance du stade sont époustouflants..."
            rows={3}
            maxLength={1000}
            className="w-full bg-[#101010] border border-[#333] focus:border-[#D4AF37] rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all resize-none shadow-inner"
          />

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-zinc-500 font-mono">
              {comment.length} / 1000 caractères
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e6c148] disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-extrabold text-xs shadow-md shadow-[#D4AF37]/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Publication...' : 'Publier mon avis'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-5 rounded-2xl bg-[#141414] border border-[#262626] text-center space-y-3">
          <p className="text-xs text-zinc-300">
            Connectez-vous avec votre compte Google pour publier un avis et noter les performances.
          </p>
          <button
            type="button"
            onClick={signIn}
            className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#e6c148] text-black font-extrabold text-xs shadow-md shadow-[#D4AF37]/20 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Connexion Google pour Noter</span>
          </button>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
          Avis récents de la communauté ({reviews.length})
        </h4>

        {reviews.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#141414] border border-[#262626] text-center text-xs text-zinc-500 italic">
            Soyez le premier fan à laisser un avis sur cette session de concert BGla Mac !
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-[#141414] border border-[#262626] hover:border-[#383838] transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {rev.authorPhotoURL ? (
                        <img
                          src={rev.authorPhotoURL}
                          alt={rev.authorName}
                          className="w-8 h-8 rounded-xl object-cover border border-[#D4AF37]/40"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold text-xs">
                          {rev.authorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h5 className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                          {rev.authorName}
                        </h5>
                        <span className="text-[10px] text-zinc-500 block">
                          {new Date(rev.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Star Rating display */}
                    <div className="flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= rev.rating ? 'fill-current text-amber-400' : 'text-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed break-words">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-2 border-t border-[#202020] flex items-center justify-between text-[10px] text-zinc-500">
                  <span className="font-mono text-[#D4AF37]">Vérifié BGla Mac</span>
                  <span>Fan certifié</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
