
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Transaction {
  code: string;
  recipient: string;
  amount: number;
  datetime: Date;
  category?: string | null;
}

const Index = () => {
  const [smsText, setSmsText] = useState("");
  const [importName, setImportName] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createImportMutation = useMutation({
    mutationFn: async (transactions: Transaction[]) => {
      // First, get existing categorizations for recipients
      const recipients = transactions.map(t => t.recipient);
      const { data: existingCategories, error: categoriesError } = await supabase
        .from("transactions")
        .select("recipient, category")
        .in("recipient", recipients)
        .not("category", "is", null)
        .order("created_at", { ascending: false });

      if (categoriesError) throw categoriesError;

      // Create a map of recipient to their most recent category
      const recipientCategories = new Map<string, string>();
      existingCategories?.forEach(({ recipient, category }) => {
        if (!recipientCategories.has(recipient) && category) {
          recipientCategories.set(recipient, category);
        }
      });

      // Apply categories to new transactions where possible
      const categorizedTransactions = transactions.map(t => ({
        ...t,
        category: recipientCategories.get(t.recipient) || null,
      }));

      // Create the import
      const { data: importData, error: importError } = await supabase
        .from("imports")
        .insert([
          {
            name: importName,
            total_count: transactions.length,
            completed_count: categorizedTransactions.filter(t => t.category !== null).length,
          },
        ])
        .select()
        .single();

      if (importError) throw importError;

      // Insert the transactions with their auto-assigned categories
      const { error: transactionsError } = await supabase
        .from("transactions")
        .insert(
          categorizedTransactions.map((t) => ({
            ...t,
            import_id: importData.id,
            datetime: t.datetime.toISOString(),
          }))
        );

      if (transactionsError) throw transactionsError;

      const autoCategorizedCount = categorizedTransactions.filter(t => t.category !== null).length;
      if (autoCategorizedCount > 0) {
        toast({
          title: "Auto-categorization applied",
          description: `${autoCategorizedCount} transaction(s) were automatically categorized based on previous data.`,
        });
      }

      return importData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      toast({
        title: "Success",
        description: "Transactions imported successfully",
      });
      navigate(`/import/${data.id}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import transactions",
        variant: "destructive",
      });
      console.error("Error importing transactions:", error);
    },
  });

  const parseSMS = (text: string): Transaction[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsedTransactions: Transaction[] = [];

    for (const line of lines) {
      const codeMatch = line.match(/^([A-Z0-9]+)/);
      const amountMatch = line.match(/Ksh\s*([\d,]+\.?\d*)/);
      const recipientMatch = line.match(/(?:sent to|paid to) ([^.]+?)(?=\s+on|\.)/);
      const dateMatch = line.match(/on (\d{1,2}\/\d{1,2}\/\d{2}) at (\d{1,2}:\d{2} [AP]M)/);

      if (codeMatch && amountMatch && recipientMatch && dateMatch) {
        const code = codeMatch[1];
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        const recipient = recipientMatch[1].trim();
        const [day, month, year] = dateMatch[1].split('/').map(num => parseInt(num));
        const timeStr = dateMatch[2];
        
        const hourStr = timeStr.split(':')[0];
        const minuteStr = timeStr.split(':')[1];
        const [minutes, period] = minuteStr.split(' ');
        let hour = parseInt(hourStr);
        
        if (period.toLowerCase() === 'pm' && hour !== 12) {
          hour += 12;
        } else if (period.toLowerCase() === 'am' && hour === 12) {
          hour = 0;
        }

        const datetime = new Date(2000 + year, month - 1, day, hour, parseInt(minutes));

        parsedTransactions.push({
          code,
          recipient,
          amount,
          datetime,
        });
      }
    }

    return parsedTransactions;
  };

  const handleImport = () => {
    if (!smsText.trim()) {
      toast({
        title: "Error",
        description: "Please enter SMS messages to import",
        variant: "destructive",
      });
      return;
    }

    if (!importName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for this import",
        variant: "destructive",
      });
      return;
    }

    const parsedTransactions = parseSMS(smsText);
    
    if (parsedTransactions.length === 0) {
      toast({
        title: "Error",
        description: "No valid transactions found in the SMS text",
        variant: "destructive",
      });
      return;
    }

    createImportMutation.mutate(parsedTransactions);
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Import</h1>
          <p className="text-muted-foreground mt-1">
            Import your M-PESA SMS messages
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import Transactions</CardTitle>
          <CardDescription>
            Paste your M-PESA SMS messages below to import transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Enter a name for this import..."
            value={importName}
            onChange={(e) => setImportName(e.target.value)}
          />
          <Textarea
            placeholder="Paste your SMS messages here..."
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            className="min-h-[200px]"
          />
          <Button 
            onClick={handleImport} 
            className="w-full"
            disabled={createImportMutation.isPending}
          >
            {createImportMutation.isPending ? "Importing..." : "Import Transactions"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;
