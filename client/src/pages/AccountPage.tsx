import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Send, Download, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { formatCurrency } from "@/lib/utils";
import { type Wallet } from "@db/schema";
import SendMoneyForm from "@/components/wallet/SendMoneyForm";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/accounts/:id");
  const { wallets, transactions } = useWallet();
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false);

  if (!params) {
    return null;
  }

  const wallet = wallets?.find(w => w.id === parseInt(params.id));
  if (!wallet) {
    return <div>Wallet not found</div>;
  }

  const walletTransactions = transactions?.filter(
    t => t.metadata?.fromAddress === wallet.address || t.metadata?.toAddress === wallet.address
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            className="mb-6 text-primary-foreground hover:text-primary-foreground/80"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-foreground/10 rounded-full">
                <img src="/path/to/wallet-icon.svg" alt="" className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{wallet.name}</h1>
                <p className="text-primary-foreground/60">{wallet.type} Account</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-4xl font-bold">
                {formatCurrency(Number(wallet.balance), 'AVAX')}
              </div>
              <div className="text-xl text-primary-foreground/60">
                ≈ {formatCurrency(Number(wallet.usdBalance || 0))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Button
            className="h-auto py-4 px-6"
            onClick={() => setSendMoneyOpen(true)}
          >
            <Send className="h-5 w-5 mb-2" />
            <span className="block">Send</span>
          </Button>
          <Button className="h-auto py-4 px-6" variant="outline">
            <Download className="h-5 w-5 mb-2" />
            <span className="block">Receive</span>
          </Button>
          <Button className="h-auto py-4 px-6" variant="outline">
            <MoreHorizontal className="h-5 w-5 mb-2" />
            <span className="block">More</span>
          </Button>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Transaction History</h2>
          
          <div className="space-y-4">
            {walletTransactions?.map((tx) => {
              const isSender = tx.metadata?.fromAddress === wallet.address;
              return (
                <div key={tx.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {isSender ? 'Sent' : 'Received'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </div>
                    {tx.metadata?.note && (
                      <div className="text-sm text-muted-foreground">
                        {tx.metadata.note}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={isSender ? "text-destructive" : "text-green-600"}>
                      {isSender ? '-' : '+'}{formatCurrency(Number(tx.amount), 'AVAX')}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {tx.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Dialog open={sendMoneyOpen} onOpenChange={setSendMoneyOpen}>
        <DialogContent className="sm:max-w-md">
          <SendMoneyForm selectedWalletId={wallet.id} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
