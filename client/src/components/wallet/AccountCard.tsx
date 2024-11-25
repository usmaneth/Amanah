import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Wallet } from "@db/schema";
import { formatCurrency } from "@/lib/utils";

interface AccountCardProps {
  wallet: Wallet;
}

export default function AccountCard({ wallet }: AccountCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex justify-between items-center">
          <span className="text-lg font-medium">{wallet.name}</span>
          <span className="text-sm font-normal capitalize">{wallet.type}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="text-2xl font-bold">
          {formatCurrency(Number(wallet.balance))}
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          Created {new Date(wallet.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}
