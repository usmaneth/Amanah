import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import AccountCard from "../components/wallet/AccountCard";
import SendMoneyForm from "../components/wallet/SendMoneyForm";
import ZakatCalculator from "../components/wallet/ZakatCalculator";
import { useWallet } from "../hooks/use-wallet";
import { useUser } from "../hooks/use-user";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function HomePage() {
  const { user, logout } = useUser();
  const { wallets, isLoading } = useWallet();
  const [activeTab, setActiveTab] = useState("accounts");
  const [createWalletOpen, setCreateWalletOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Amanah</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Welcome, {user?.username}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="send">Send Money</TabsTrigger>
            <TabsTrigger value="zakat">Zakat</TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="mt-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Your Wallets</h2>
                <Button onClick={() => setCreateWalletOpen(true)}>
                  Create New Wallet
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {wallets?.map((wallet) => (
                  <AccountCard key={wallet.id} wallet={wallet} />
                ))}
              </div>
              <CreateWalletForm 
                open={createWalletOpen} 
                onOpenChange={setCreateWalletOpen} 
              />
            </div>
          </TabsContent>

          <TabsContent value="send">
            <Card className="max-w-md mx-auto p-6">
              <SendMoneyForm />
            </Card>
          </TabsContent>

          <TabsContent value="zakat">
            <Card className="max-w-md mx-auto p-6">
              <ZakatCalculator wallets={wallets || []} />
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
