import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, CreditCard, Shield, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const createWalletSchema = z.object({
  type: z.enum(["personal", "emergency", "investments"], {
    required_error: "Please select an account type",
  }),
});

interface AccountTypeOption {
  id: "personal" | "emergency" | "investments";
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  className?: string;
  tagColor: string;
}

const accountTypes: AccountTypeOption[] = [
  {
    id: "personal",
    title: "Personal Spending",
    description: "Daily transactions and payments",
    icon: <CreditCard className="h-8 w-8" />,
    features: ["Instant Payments", "Bill Pay", "Local Transfers"],
    className: "bg-green-50",
    tagColor: "text-green-600 bg-green-100",
  },
  {
    id: "emergency",
    title: "Emergency Fund",
    description: "Secure savings for unexpected needs",
    icon: <Shield className="h-8 w-8" />,
    features: ["USDC Holdings", "No Lock Period", "Quick Access"],
    className: "bg-blue-50",
    tagColor: "text-blue-600 bg-blue-100",
  },
  {
    id: "investments",
    title: "Halal Investments",
    description: "Shariah-compliant investment wallet",
    icon: <TrendingUp className="h-8 w-8" />,
    features: ["Sukuk Tokens", "Halal Stocks", "Automated Zakat"],
    className: "bg-purple-50",
    tagColor: "text-purple-600 bg-purple-100",
  },
];

type CreateWalletForm = z.infer<typeof createWalletSchema>;

interface CreateWalletFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateWalletForm({ open, onOpenChange }: CreateWalletFormProps) {
  const { createWallet } = useWallet();
  const { toast } = useToast();
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [selectedType, setSelectedType] = useState<AccountTypeOption | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");

  const form = useForm<CreateWalletForm>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      type: "personal",
    },
  });

  const onSubmit = async (data: CreateWalletForm) => {
    try {
      const result = await createWallet({
        name: selectedType?.title || "",
        type: data.type,
      });
      
      if (result.ok) {
        setWalletAddress(result.address || "");
        setStep("confirm");
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
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedType(null);
    setWalletAddress("");
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          {step === "select" ? (
            <>
              <DialogTitle className="text-2xl">Choose Your Account</DialogTitle>
              <p className="text-muted-foreground">
                Select the type of account you want to create
              </p>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="absolute left-4 top-4"
                onClick={() => setStep("select")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <DialogTitle className="text-2xl">Account Setup</DialogTitle>
              <p className="text-muted-foreground">
                Configure your {selectedType?.title}
              </p>
            </>
          )}
        </DialogHeader>

        {step === "select" ? (
          <div className="space-y-4 mt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-4">
                  {accountTypes.map((type) => (
                    <div
                      key={type.id}
                      className={cn(
                        "p-4 rounded-lg cursor-pointer transition-colors",
                        type.className,
                        selectedType?.id === type.id
                          ? "ring-2 ring-primary"
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        setSelectedType(type);
                        form.setValue("type", type.id);
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-2 rounded-full",
                          type.className
                        )}>
                          {type.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{type.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {type.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {type.features.map((feature) => (
                              <span
                                key={feature}
                                className={cn(
                                  "text-xs px-2 py-1 rounded-full",
                                  type.tagColor
                                )}
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  type="submit"
                  className="w-full mt-6"
                  disabled={!selectedType}
                >
                  Create Account
                </Button>
              </form>
            </Form>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2 rounded-full",
                selectedType?.className
              )}>
                {selectedType?.icon}
              </div>
              <div>
                <h3 className="font-semibold">{selectedType?.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Self-custodial wallet
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Wallet Address
              </label>
              <div className="p-3 bg-muted rounded-lg break-all font-mono text-sm">
                {walletAddress}
              </div>
            </div>

            <Button className="w-full" onClick={handleClose}>
              Create Account
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
