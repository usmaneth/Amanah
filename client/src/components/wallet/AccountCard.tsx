import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Wallet } from "@db/schema";
import { formatCurrency, cn } from "@/lib/utils";
import { CreditCard, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AccountCardProps {
  wallet: Wallet;
}

const accountTypeConfig = {
  personal: {
    icon: CreditCard,
    className: "bg-green-50",
    tagColor: "text-green-600 bg-green-100",
    features: ["Instant Payments", "Bill Pay", "Local Transfers"],
  },
  emergency: {
    icon: Shield,
    className: "bg-blue-50",
    tagColor: "text-blue-600 bg-blue-100",
    features: ["USDC Holdings", "No Lock Period", "Quick Access"],
  },
  investments: {
    icon: TrendingUp,
    className: "bg-purple-50",
    tagColor: "text-purple-600 bg-purple-100",
    features: ["Sukuk Tokens", "Halal Stocks", "Automated Zakat"],
  },
} as const;

export default function AccountCard({ wallet }: AccountCardProps) {
  const [showAddress, setShowAddress] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const type = wallet.type as keyof typeof accountTypeConfig;
  const config = accountTypeConfig[type];
  const Icon = config?.icon || CreditCard;

  return (
    <Card 
      className={cn(
        "overflow-hidden cursor-pointer transition-shadow hover:shadow-lg", 
        config?.className
      )}
      onClick={() => setLocation(`/accounts/${wallet.id}`)}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className={cn("p-2 rounded-full", config?.className)}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <span className="text-lg font-medium block">{wallet.name}</span>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground block">
                {formatCurrency(Number(wallet.balance), 'AVAX')}
              </span>
              <span className="text-xs text-muted-foreground block">
                ≈ {formatCurrency(Number(wallet.usdBalance || '0'))}
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {config?.features.map((feature) => (
            <span
              key={feature}
              className={cn(
                "text-xs px-2 py-1 rounded-full",
                config.tagColor
              )}
            >
              {feature}
            </span>
          ))}
        </div>
        
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddress(!showAddress)}
          >
            {showAddress ? "Hide" : "Show"} Wallet Address
          </Button>
          
          {showAddress && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 p-2 bg-muted rounded-lg break-all font-mono text-xs">
                  {wallet.address}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(wallet.address);
                    toast({
                      title: "Address Copied",
                      description: "Wallet address has been copied to clipboard",
                    });
                  }}
                >
                  Copy
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                <p>This is a Fuji testnet wallet. Add it to MetaMask or other wallets using:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Network: Avalanche Fuji Testnet</li>
                  <li>Chain ID: 43113</li>
                  <li>RPC: https://api.avax-test.network/ext/bc/C/rpc</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
