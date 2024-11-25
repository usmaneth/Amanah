import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import { formatCurrency } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const sendMoneySchema = z.object({
  recipient: z.string().min(1, "Recipient is required"),
  amount: z.string().min(1, "Amount is required"),
  note: z.string().optional(),
  useAddress: z.boolean().default(false),
});

type SendMoneyForm = z.infer<typeof sendMoneySchema>;

interface ConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  data: {
    recipient: string;
    amount: string;
    note?: string;
    useAddress: boolean;
  };
  isLoading: boolean;
}

function ConfirmationDialog({ open, onClose, onConfirm, data, isLoading }: ConfirmationDialogProps) {
  const amountInAvax = Number(data.amount);
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Transaction</DialogTitle>
          <DialogDescription>
            Please review the transaction details before confirming
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Sending to:</span>
            <span className="text-sm font-medium">
              {data.useAddress ? (
                <span className="font-mono">{data.recipient}</span>
              ) : (
                data.recipient
              )}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount:</span>
            <div className="space-y-1 text-right">
              <span className="text-sm font-medium">
                {formatCurrency(amountInAvax, 'AVAX')}
              </span>
            </div>
          </div>

          {data.note && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Note:</span>
              <span className="text-sm">{data.note}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Confirm & Send'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SendMoneyForm() {
  const { sendMoney } = useWallet();
  const { toast } = useToast();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SendMoneyForm>({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: {
      recipient: "",
      amount: "",
      note: "",
      useAddress: false,
    },
  });

  const handleSendMoney = async (data: SendMoneyForm) => {
    setIsLoading(true);
    try {
      const result = await sendMoney({
        recipient: data.recipient,
        amount: parseFloat(data.amount),
        note: data.note,
        useAddress: data.useAddress,
      });

      if (result.ok) {
        toast({
          title: "Success",
          description: "Money sent successfully",
        });
        form.reset();
        setShowConfirmation(false);
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
      setIsLoading(false);
    }
  };

  const onSubmit = (data: SendMoneyForm) => {
    setShowConfirmation(true);
  };

  const values = form.watch();
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <FormLabel>Send using:</FormLabel>
            <Toggle
              pressed={values.useAddress}
              onPressedChange={(pressed) => form.setValue('useAddress', pressed)}
              className="data-[state=on]:bg-primary"
            >
              {values.useAddress ? 'Wallet Address' : 'Username'}
            </Toggle>
          </div>

          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {values.useAddress ? 'Recipient Address' : 'Recipient Username'}
                </FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    placeholder={values.useAddress ? 
                      "Enter wallet address" : 
                      "Enter username"
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (AVAX)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input 
                      {...field} 
                      type="number" 
                      step="0.0001" 
                      min="0" 
                      placeholder="0.0000" 
                    />
                    <div className="absolute right-3 top-2.5 text-sm text-muted-foreground">
                      AVAX
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note (Optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Add a note" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">Review Transaction</Button>
        </form>
      </Form>

      <ConfirmationDialog
        open={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={() => handleSendMoney(form.getValues())}
        data={form.getValues()}
        isLoading={isLoading}
      />
    </>
  );
}
