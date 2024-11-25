import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";

const createWalletSchema = z.object({
  name: z.string().min(1, "Wallet name is required"),
  type: z.enum(["daily", "family", "zakat"], {
    required_error: "Please select a wallet type",
  }),
});

type CreateWalletForm = z.infer<typeof createWalletSchema>;

interface CreateWalletFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateWalletForm({ open, onOpenChange }: CreateWalletFormProps) {
  const { createWallet } = useWallet();
  const { toast } = useToast();

  const form = useForm<CreateWalletForm>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      name: "",
      type: "daily",
    },
  });

  const onSubmit = async (data: CreateWalletForm) => {
    try {
      const result = await createWallet(data);
      
      if (result.ok) {
        toast({
          title: "Success",
          description: "Wallet created successfully",
        });
        form.reset();
        onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Wallet</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter wallet name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily Spending</SelectItem>
                      <SelectItem value="family">Family Account</SelectItem>
                      <SelectItem value="zakat">Zakat Savings</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">
              Create Wallet
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
