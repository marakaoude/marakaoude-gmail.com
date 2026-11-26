import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { firebaseConfig } from '../firebase';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isQuotaError: boolean;
  isDailyFreeQuota: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
      isQuotaError: false,
      isDailyFreeQuota: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const msg = error?.message || 'Une erreur inattendue est survenue.';
    const isQuotaError = msg.includes('Quota exceeded');
    const isDailyFreeQuota = msg.includes(
      "Quota exceeded for quota metric 'Free daily read units per project (free tier database)'"
    );
    return {
      hasError: true,
      errorMessage: msg,
      isQuotaError,
      isDailyFreeQuota,
    };
  }

  render() {
    if (this.state.hasError) {
      const upgradeLink = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${firebaseConfig.firestoreDatabaseId}/data?openUpgradeDialog=true`;

      return (
        <div className="min-h-screen bg-[#101010] text-zinc-100 flex items-center justify-center p-6 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="max-w-lg w-full bg-[#1D1D1D] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-white font-['Syne',sans-serif]">
                  Erreur de connexion ou de sécurité Firebase
                </h2>
                <p className="text-xs text-zinc-400">
                  L'application a intercepté une exception pour protéger vos données.
                </p>
              </div>
            </div>

            {this.state.isQuotaError ? (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs text-amber-200 space-y-2">
                <p>
                  Le quota quotidien gratuit de Firestore a été atteint. Il sera réinitialisé demain (plan Spark / Enterprise Edition).
                </p>
                {this.state.isDailyFreeQuota && (
                  <a
                    href={upgradeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-[#D4AF37] underline font-bold"
                  >
                    Gérer le quota dans la console Firebase →
                  </a>
                )}
              </div>
            ) : (
              <pre className="p-3 rounded-xl bg-black/60 border border-zinc-800 text-[11px] text-rose-300 font-mono overflow-x-auto max-h-48 whitespace-pre-wrap">
                {this.state.errorMessage}
              </pre>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#e6c148] text-black font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Recharger BGla Mac</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
