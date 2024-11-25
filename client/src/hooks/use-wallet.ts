import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Wallet, Transaction } from "@db/schema";

interface SendMoneyParams {
  recipientUsername: string;
  amount: number;
  note?: string;
}

interface RequestResult {
  ok: boolean;
  message?: string;
}

export function useWallet() {
  const queryClient = useQueryClient();

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

  return {
    wallets,
    transactions,
    isLoading,
    sendMoney: sendMoneyMutation.mutateAsync,
    payZakat: payZakatMutation.mutateAsync,
  };
}
