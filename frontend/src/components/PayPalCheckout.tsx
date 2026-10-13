import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface PayPalButtons {
  render: (container: HTMLElement) => Promise<void>;
  close?: () => Promise<void>;
}

interface PayPalSdk {
  Buttons: (options: {
    style?: Record<string, string | number>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onError: (error: unknown) => void;
  }) => PayPalButtons;
}

declare global {
  interface Window {
    paypal?: PayPalSdk;
  }
}

/** Script PayPal chargé une seule fois, uniquement quand un praticien choisit de payer par PayPal. */
let sdk: Promise<PayPalSdk> | null = null;

function loadSdk(clientId: string): Promise<PayPalSdk> {
  sdk ??= new Promise<PayPalSdk>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?${new URLSearchParams({ "client-id": clientId, currency: "USD", intent: "capture", components: "buttons" })}`;
    script.async = true;
    script.onload = () => (window.paypal ? resolve(window.paypal) : reject(new Error("PayPal")));
    script.onerror = () => {
      sdk = null;
      script.remove();
      reject(new Error("PayPal"));
    };
    document.head.appendChild(script);
  });
  return sdk;
}

/**
 * Bouton PayPal d'une commande d'abonnement en attente. Le montant en dollars est fixé par le serveur
 * (commande PayPal créée par l'API AlloDoc), puis le paiement est capturé et vérifié côté serveur.
 */
export function PayPalCheckout({ subscriptionId, clientId, onPaid }: { subscriptionId: string; clientId: string; onPaid: () => void }) {
  const { t } = useI18n();
  const container = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "processing" | "unavailable">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let buttons: PayPalButtons | null = null;
    let cancelled = false;
    loadSdk(clientId)
      .then((paypal) => {
        if (cancelled || !container.current) return;
        buttons = paypal.Buttons({
          style: { layout: "vertical", shape: "pill", label: "pay", height: 48 },
          createOrder: async () => {
            setError(null);
            const res = await api<{ orderId: string }>(`/api/pro/subscriptions/${subscriptionId}/paypal`, { method: "POST" });
            return res.orderId;
          },
          onApprove: async (data) => {
            setState("processing");
            try {
              await api(`/api/pro/subscriptions/${subscriptionId}/paypal/capture`, { method: "POST", body: JSON.stringify({ orderId: data.orderID }) });
              onPaid();
            } catch (err) {
              // 409 : la commande a changé côté serveur (déjà payée, ou paiement reçu à vérifier) : afficher l'état réel.
              if (err instanceof ApiError && err.status === 409) {
                onPaid();
                return;
              }
              setState("ready");
              setError(err instanceof ApiError ? err.message : t("sub.paypalFailed"));
            }
          },
          onError: (err) => setError(err instanceof ApiError ? err.message : t("sub.paypalFailed")),
        });
        return buttons.render(container.current).then(() => !cancelled && setState("ready"));
      })
      .catch(() => !cancelled && setState("unavailable"));
    return () => {
      cancelled = true;
      buttons?.close?.().catch(() => {});
    };
  }, [clientId, subscriptionId, onPaid, t]);

  return (
    <div className="paypal-box">
      {state === "loading" && <p className="muted small">{t("sub.paypalLoading")}</p>}
      {state === "processing" && <p className="alert alert-info">{t("sub.paypalProcessing")}</p>}
      {state === "unavailable" && <p className="alert alert-warn">{t("sub.paypalUnavailable")}</p>}
      {error && <p className="alert alert-error">{error}</p>}
      <div ref={container} hidden={state === "processing" || state === "unavailable"} />
    </div>
  );
}
