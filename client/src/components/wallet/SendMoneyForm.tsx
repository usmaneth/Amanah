import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const sendMoneySchema = z.object({
  recipient: z.string().min(1, "Recipient username is required"),
  amount: z.string().min(1, "Amount is required"),
  note: z.string().optional(),
});

type SendMoneyForm = z.infer<typeof sendMoneySchema>;

export default function SendMoneyForm() {
  const { sendMoney } = useWallet();
  const { toast } = useToast();

  const form = useForm<SendMoneyForm>({
    resolver: zodResolver(sendMoneySchema),
    defaultValues: {
      recipient: "",
      amount: "",
      note: "",
    },
  });

  const onSubmit = async (data: SendMoneyForm) => {
    try {
      const result = await sendMoney({
        recipientUsername: data.recipient,
        amount: parseFloat(data.amount),
        note: data.note,
      });

      if (result.ok) {
        toast({
          title: "Success",
          description: "Money sent successfully",
        });
        form.reset();
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="recipient"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Recipient Username</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter username" />
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
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" />
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

        <Button type="submit" className="w-full">Send Money</Button>
      </form>
    </Form>
  );
}
