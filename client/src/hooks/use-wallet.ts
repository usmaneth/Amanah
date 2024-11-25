import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Wallet, Transaction } from "@db/schema";
import ReconnectingWebSocket from "reconnecting-websocket";
import { useEffect } from "react";

interface SendMoneyParams {
  walletId: number;
  recipient: string;
  amount: number;
  note?: string;
  useAddress: boolean;
}

interface WalletResponse {
  id: number;
  address: string;
  name: string;
  type: string;
  balance: string;
}

interface RequestResult {
  ok: boolean;
  message?: string;
  wallet?: WalletResponse;
  error?: string;
  details?: {
    amount: string;
    estimatedGasFees: string;
    totalRequired: string;
    currentBalance: string;
  };
}

let webSocket: ReconnectingWebSocket | null = null;

export function useWallet() {
  const queryClient = useQueryClient();

  // Setup WebSocket connection
  useEffect(() => {
    if (!webSocket) {
      webSocket = new ReconnectingWebSocket(`wss://${window.location.host}/ws`);
      
      webSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'BALANCE_UPDATE') {
          queryClient.setQueryData(['wallets'], (oldData: Wallet[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map(wallet => 
              wallet.id === data.walletId 
                ? { ...wallet, balance: data.balance }
                : wallet
            );
          });
        }

        if (data.type === 'TRANSACTION_UPDATE') {
          queryClient.invalidateQueries(['transactions']);
        }
      };
    }

    return () => {
      if (webSocket) {
        webSocket.close();
        webSocket = null;
      }
    };
  }, [queryClient]);

  const { data: wallets, isLoading } = useQuery<Wallet[]>({
    queryKey: ["wallets"],
    queryFn: async () => {
      const response = await fetch("/api/wallets");
      if (!response.ok) {
        throw new Error("Failed to fetch wallets");
      }
      return response.json();
    },
  });

  const { data: transactions } = useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      return response.json();
    },
  });

  const sendMoneyMutation = useMutation<RequestResult, Error, SendMoneyParams>({
    mutationFn: async (data) => {
      const response = await fetch("/api/transactions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        return { ok: false, message: error };
      }

      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const payZakatMutation = useMutation<RequestResult, Error, number>({
    mutationFn: async (amount) => {
      const response = await fetch("/api/transactions/zakat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { ok: false, message: error };
      }

      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const createWalletMutation = useMutation<RequestResult, Error, { name: string; type: string; }>({
    mutationFn: async (data) => {
      const response = await fetch("/api/wallets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        return { ok: false, message: error };
      }

      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
    },
  });

  return {
    wallets,
    transactions,
    isLoading,
    sendMoney: sendMoneyMutation.mutateAsync,
    payZakat: payZakatMutation.mutateAsync,
    createWallet: createWalletMutation.mutateAsync,
  };
}
