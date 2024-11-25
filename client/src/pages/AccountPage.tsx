import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Send, Download, MoreHorizontal, Copy, Share2, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { formatCurrency } from "@/lib/utils";
import { type Wallet } from "@db/schema";
import SendMoneyForm from "@/components/wallet/SendMoneyForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute<{ id: string }>("/accounts/:id");
  const { wallets, transactions } = useWallet();
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { toast } = useToast();

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

            <div className="space-y-2">
              <div className="text-5xl font-bold tracking-tight">
                {formatCurrency(Number(wallet.balance), 'AVAX')}
              </div>
              <div className="text-2xl text-primary-foreground/70 flex items-center gap-2">
                <span>≈ {formatCurrency(Number(wallet.usdBalance || 0))}</span>
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
          <Button 
            className="h-auto py-4 px-6" 
            variant="outline"
            onClick={() => setReceiveOpen(true)}
          >
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

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Funds</DialogTitle>
            <DialogDescription>
              Scan this QR code or share your wallet address to receive funds
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG 
                value={wallet.address}
                size={200}
                level="H"
                includeMargin
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Wallet Address</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(wallet.address);
                    toast({
                      title: "Address Copied",
                      description: "Wallet address copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-lg break-all font-mono text-sm">
                {wallet.address}
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="font-medium mb-2">Network Details</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Network:</dt>
                    <dd className="font-medium">Avalanche Fuji Testnet</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Chain ID:</dt>
                    <dd className="font-medium">43113</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  const url = `${window.location.origin}/share/${wallet.address}`;
                  navigator.clipboard.writeText(url);
                  toast({
                    title: "Link Copied",
                    description: "Shareable link copied to clipboard",
                  });
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`https://testnet.snowtrace.io/address/${wallet.address}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Explorer
              </Button>
            </div>

            <div className="flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  const url = encodeURIComponent(`${window.location.origin}/share/${wallet.address}`);
                  window.open(`https://twitter.com/intent/tweet?text=Send me AVAX on the Fuji testnet!&url=${url}`, '_blank');
                }}
              >
                Share on Twitter
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const url = encodeURIComponent(`${window.location.origin}/share/${wallet.address}`);
                  window.open(`https://telegram.me/share/url?url=${url}&text=Send me AVAX on the Fuji testnet!`, '_blank');
                }}
              >
                Share on Telegram
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
