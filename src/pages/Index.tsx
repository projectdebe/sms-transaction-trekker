
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  code: string;
  recipient: string;
  amount: number;
  datetime: Date;
  category?: string;
}

interface Category {
  id: string;
  name: string;
}

const Index = () => {
  const [smsText, setSmsText] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
      return;
    }

    setCategories(data);
  };

  const parseSMS = (text: string): Transaction[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const parsedTransactions: Transaction[] = [];

    for (const line of lines) {
      // Example pattern: Looking for amount, recipient, and transaction code
      const amountMatch = line.match(/\$?\d+(\.\d{2})?/);
      const recipientMatch = line.match(/(?:to|at|for)\s+([A-Za-z0-9\s&]+)/i);
      const codeMatch = line.match(/(?:ref|code|tx)[:.\s]*([A-Za-z0-9]+)/i);

      if (amountMatch) {
        const amount = parseFloat(amountMatch[0].replace('$', ''));
        const recipient = recipientMatch ? recipientMatch[1].trim() : 'Unknown';
        const code = codeMatch ? codeMatch[1] : `TX${Math.random().toString(36).substr(2, 6)}`;

        parsedTransactions.push({
          code,
          recipient,
          amount,
          datetime: new Date(),
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

    const parsedTransactions = parseSMS(smsText);
    
    if (parsedTransactions.length === 0) {
      toast({
        title: "Error",
        description: "No valid transactions found in the SMS text",
        variant: "destructive",
      });
      return;
    }

    setTransactions(parsedTransactions);
    toast({
      title: "Success",
      description: `${parsedTransactions.length} transaction(s) imported successfully`,
    });
  };

  const handleCategoryChange = (transactionIndex: number, category: string) => {
    const updatedTransactions = [...transactions];
    updatedTransactions[transactionIndex] = {
      ...updatedTransactions[transactionIndex],
      category,
    };
    setTransactions(updatedTransactions);
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">SMS Transaction Tracker</h1>
        <div className="space-y-4">
          <Textarea
            placeholder="Paste your SMS messages here..."
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            className="min-h-[200px]"
          />
          <Button onClick={handleImport} className="w-full">
            Import Transactions
          </Button>
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-left">Code</th>
                <th className="p-4 text-left">Recipient</th>
                <th className="p-4 text-left">Amount</th>
                <th className="p-4 text-left">Date/Time</th>
                <th className="p-4 text-left">Category</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <tr key={index} className="border-b">
                  <td className="p-4">{transaction.code}</td>
                  <td className="p-4">{transaction.recipient}</td>
                  <td className="p-4">${transaction.amount.toFixed(2)}</td>
                  <td className="p-4">
                    {transaction.datetime.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <Select
                      value={transaction.category}
                      onValueChange={(value) =>
                        handleCategoryChange(index, value)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Index;
