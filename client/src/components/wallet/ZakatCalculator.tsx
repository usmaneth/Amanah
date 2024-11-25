import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Wallet } from "@db/schema";
import { formatCurrency } from "@/lib/utils";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";

interface ZakatCalculatorProps {
  wallets: Wallet[];
}

const NISAB_THRESHOLD = 5000; // Example threshold in USD
const ZAKAT_RATE = 0.025; // 2.5%

export default function ZakatCalculator({ wallets }: ZakatCalculatorProps) {
  const { payZakat } = useWallet();
  const { toast } = useToast();
  const [calculating, setCalculating] = useState(false);

  const totalWealth = wallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
  const zakatAmount = totalWealth * ZAKAT_RATE;
  const isEligible = totalWealth >= NISAB_THRESHOLD;

  const handlePayZakat = async () => {
    try {
      setCalculating(true);
      const result = await payZakat(zakatAmount);
      
      if (result.ok) {
        toast({
          title: "Success",
          description: "Zakat payment successful",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zakat Calculator</CardTitle>
          <CardDescription>
            Calculate your annual Zakat based on your total wealth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2">
            <span>Total Wealth:</span>
            <span className="font-bold">{formatCurrency(totalWealth)}</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Nisab Threshold:</span>
            <span className="font-medium">{formatCurrency(NISAB_THRESHOLD)}</span>
          </div>
          <div className="flex justify-between py-2 border-t">
            <span>Zakat Amount (2.5%):</span>
            <span className="font-bold text-primary">{formatCurrency(zakatAmount)}</span>
          </div>
          
          {isEligible ? (
            <Button
              className="w-full mt-4"
              onClick={handlePayZakat}
              disabled={calculating}
            >
              Pay Zakat Now
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground mt-4">
              Your wealth is below the Nisab threshold. Zakat is not obligatory at this time.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
