
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

interface Transaction {
  code: string;
  recipient: string;
  amount: number;
  datetime: Date;
}

const Index = () => {
  const [smsText, setSmsText] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const handleImport = () => {
    if (!smsText.trim()) {
      toast({
        title: "Error",
        description: "Please enter SMS messages to import",
        variant: "destructive",
      });
      return;
    }

    // Placeholder parsing logic - this would need to be enhanced based on actual SMS format
    const dummyTransaction: Transaction = {
      code: "TX123",
      recipient: "John Doe",
      amount: 1000,
      datetime: new Date(),
    };

    setTransactions([...transactions, dummyTransaction]);
    toast({
      title: "Success",
      description: "Transaction imported successfully",
    });
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
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction, index) => (
                <tr key={index} className="border-b">
                  <td className="p-4">{transaction.code}</td>
                  <td className="p-4">{transaction.recipient}</td>
                  <td className="p-4">${transaction.amount}</td>
                  <td className="p-4">
                    {transaction.datetime.toLocaleString()}
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
