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
import { ArrowUpDown, X, PlusCircle, FileText, Table as TableIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transaction {
  id?: string;
  code: string;
  recipient: string;
  amount: number;
  datetime: Date;
  category?: string | null;
  import_id?: string | null;
  user_id?: string | null;
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
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [importName, setImportName] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    order: SortOrder;
  }>({ field: "datetime", order: "desc" });
  const [activeTab, setActiveTab] = useState("import");

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const importId = searchParams.get("import");

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch existing transactions
  const { data: savedTransactions = [] } = useQuery({
    queryKey: ["transactions", importId],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .order("datetime", { ascending: false });
      
      if (importId) {
        query = query.eq("import_id", importId);
      }

      const { data, error } = await query;

      if (error) throw error;

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

  // Update transaction category mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ ids, category }: { ids: string[]; category: string }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ category })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      toast({
        title: "Success",
        description: `Updated category for ${selectedTransactions.length} transaction(s)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update transaction categories",
        variant: "destructive",
      });
      console.error("Error updating transactions:", error);
    },
  });

  // Create import mutation
  const createImportMutation = useMutation({
    mutationFn: async (transactions: Transaction[]) => {
      const { data: importData, error: importError } = await supabase
        .from("imports")
        .insert([
          {
            name: importName,
            total_count: transactions.length,
            completed_count: 0,
          },
        ])
        .select()
        .single();

      if (importError) throw importError;

      const { error: transactionsError } = await supabase
        .from("transactions")
        .insert(
          transactions.map((t) => ({
            ...t,
            import_id: importData.id,
            datetime: t.datetime.toISOString(),
          }))
        );

      if (transactionsError) throw transactionsError;

      return importData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      toast({
        title: "Success",
        description: "Transactions imported successfully",
      });
      setImportName("");
      setSmsText("");
      setActiveTab("transactions");
      navigate(`/?import=${data.id}`);
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

  const handleBulkCategoryChange = (category: string) => {
    const selectedIds = selectedTransactions.filter(id => id); // Filter out any empty strings
    if (selectedIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select transactions to update",
        variant: "destructive",
      });
      return;
    }
    updateTransactionMutation.mutate({ ids: selectedIds, category });
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map((t) => t.id || '').filter(id => id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedTransactions((current) =>
      current.includes(id)
        ? current.filter((i) => i !== id)
        : [...current, id]
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

  const handleSort = (field: SortField) => {
    setSortConfig({
      field,
      order:
        sortConfig.field === field && sortConfig.order === "asc"
          ? "desc"
          : "asc",
    });
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">SMS Transaction Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Import and manage your M-PESA transactions
          </p>
        </div>
        <Button 
          variant="outline"
          onClick={() => navigate("/imports")}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          View All Imports
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            Import New
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import">
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
        </TabsContent>

        <TabsContent value="transactions">
          {transactions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>
                  Manage and categorize your imported transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
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
                            checked={selectedTransactions.length === filteredTransactions.length}
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
                      {filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b">
                          <td className="p-4">
                            <Checkbox
                              checked={transaction.id ? selectedTransactions.includes(transaction.id) : false}
                              onCheckedChange={() => transaction.id && toggleSelect(transaction.id)}
                            />
                          </td>
                          <td className="p-4">{transaction.code}</td>
                          <td className="p-4">{transaction.recipient}</td>
                          <td className="p-4">Ksh {transaction.amount.toFixed(2)}</td>
                          <td className="p-4">
                            {transaction.datetime.toLocaleString()}
                          </td>
                          <td className="p-4">
                            <Select
                              value={transaction.category || undefined}
                              onValueChange={(value) => 
                                transaction.id && 
                                updateTransactionMutation.mutate({ 
                                  ids: [transaction.id], 
                                  category: value 
                                })
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
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Transactions Yet</CardTitle>
                <CardDescription>
                  Start by importing your M-PESA SMS messages in the Import New tab
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
