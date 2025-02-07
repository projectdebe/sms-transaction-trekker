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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Transaction {
  id?: string;
  code: string;
  recipient: string;
  amount: number;
  datetime: Date;
  category?: string;
  import_name?: string;
  user_id?: string;
}

interface Category {
  id: string;
  name: string;
}

type SortField = "code" | "recipient" | "amount" | "datetime" | "category";
type SortOrder = "asc" | "desc";

const Index = () => {
  const [smsText, setSmsText] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [importName, setImportName] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    order: SortOrder;
  }>({ field: "datetime", order: "desc" });

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
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
        throw error;
      }

      return data;
    },
  });

  // Fetch existing transactions
  const { data: savedTransactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("datetime", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load transactions",
          variant: "destructive",
        });
        throw error;
      }

      return data.map(t => ({
        ...t,
        datetime: new Date(t.datetime)
      }));
    },
  });

  useEffect(() => {
    if (savedTransactions.length > 0) {
      setTransactions(savedTransactions);
    }
  }, [savedTransactions]);

  // Save transactions mutation
  const saveTransactionsMutation = useMutation({
    mutationFn: async (transactions: Transaction[]) => {
      const { error } = await supabase.from("transactions").insert(
        transactions.map(t => ({
          ...t,
          import_name: importName,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        }))
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Success",
        description: "Transactions saved successfully",
      });
      setImportName("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save transactions",
        variant: "destructive",
      });
      console.error("Error saving transactions:", error);
    },
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      const { error } = await supabase
        .from("transactions")
        .update({ category: transaction.category })
        .eq("id", transaction.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
      console.error("Error updating transaction:", error);
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

    saveTransactionsMutation.mutate(parsedTransactions);
  };

  const handleCategoryChange = (transactionIndex: number, category: string) => {
    const transaction = transactions[transactionIndex];
    if (transaction.id) {
      updateTransactionMutation.mutate({ ...transaction, category });
    } else {
      const updatedTransactions = [...transactions];
      updatedTransactions[transactionIndex] = {
        ...updatedTransactions[transactionIndex],
        category,
      };
      setTransactions(updatedTransactions);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig((current) => ({
      field,
      order: current.field === field && current.order === "asc" ? "desc" : "asc",
    }));
  };

  const handleBulkCategoryChange = (category: string) => {
    const updatedTransactions = [...transactions];
    selectedTransactions.forEach((index) => {
      updatedTransactions[index] = {
        ...updatedTransactions[index],
        category,
      };
    });
    setTransactions(updatedTransactions);
    toast({
      title: "Success",
      description: `Updated category for ${selectedTransactions.length} transaction(s)`,
    });
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map((_, index) => index));
    }
  };

  const toggleSelect = (index: number) => {
    setSelectedTransactions((current) =>
      current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index]
    );
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("");
  };

  const filteredTransactions = transactions
    .filter((transaction) => {
      const matchesSearch =
        !searchTerm ||
        transaction.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.recipient.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory =
        !categoryFilter || 
        categoryFilter === "all" || 
        transaction.category === categoryFilter;

      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const { field, order } = sortConfig;
      const modifier = order === "asc" ? 1 : -1;

      if (field === "datetime") {
        return (a.datetime.getTime() - b.datetime.getTime()) * modifier;
      }
      if (field === "amount") {
        return (a.amount - b.amount) * modifier;
      }
      return (
        (a[field]?.toString().toLowerCase() ?? "") >
        (b[field]?.toString().toLowerCase() ?? "")
          ? 1 * modifier
          : -1 * modifier
      );
    });

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">SMS Transaction Tracker</h1>
        <div className="space-y-4">
          <Input
            placeholder="Enter a name for this import..."
            value={importName}
            onChange={(e) => setImportName(e.target.value)}
            className="mb-2"
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
            disabled={saveTransactionsMutation.isPending}
          >
            {saveTransactionsMutation.isPending ? "Saving..." : "Import Transactions"}
          </Button>
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchTerm || categoryFilter) && (
              <Button
                variant="outline"
                size="icon"
                onClick={clearFilters}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {selectedTransactions.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedTransactions.length} selected
              </span>
              <Select onValueChange={handleBulkCategoryChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Set category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-4 text-left">
                    <Checkbox
                      checked={
                        selectedTransactions.length === filteredTransactions.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-4 text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("code")}
                      className="flex items-center gap-2"
                    >
                      Code
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </th>
                  <th className="p-4 text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("recipient")}
                      className="flex items-center gap-2"
                    >
                      Recipient
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </th>
                  <th className="p-4 text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("amount")}
                      className="flex items-center gap-2"
                    >
                      Amount
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </th>
                  <th className="p-4 text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("datetime")}
                      className="flex items-center gap-2"
                    >
                      Date/Time
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </th>
                  <th className="p-4 text-left">Import Name</th>
                  <th className="p-4 text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort("category")}
                      className="flex items-center gap-2"
                    >
                      Category
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction, index) => (
                  <tr key={transaction.id || index} className="border-b">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedTransactions.includes(index)}
                        onCheckedChange={() => toggleSelect(index)}
                      />
                    </td>
                    <td className="p-4">{transaction.code}</td>
                    <td className="p-4">{transaction.recipient}</td>
                    <td className="p-4">Ksh {transaction.amount.toFixed(2)}</td>
                    <td className="p-4">
                      {transaction.datetime.toLocaleString()}
                    </td>
                    <td className="p-4">{transaction.import_name}</td>
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
        </div>
      )}
    </div>
  );
};

export default Index;
