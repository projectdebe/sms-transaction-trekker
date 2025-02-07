import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

type SortField = "code" | "recipient" | "amount" | "datetime" | "category";
type SortOrder = "asc" | "desc";

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

const Transactions = () => {
  const navigate = useNavigate();
  const { importId } = useParams();
  const queryClient = useQueryClient();
  
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    field: SortField;
    order: SortOrder;
  }>({ field: "datetime", order: "desc" });

  const { data: importData } = useQuery({
    queryKey: ["imports", importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imports")
        .select("*")
        .eq("id", importId)
        .single();

      if (error) throw error;
      return data;
    },
  });

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

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("import_id", importId)
        .order("datetime", { ascending: false });

      if (error) throw error;
      return data.map((t: any) => ({
        ...t,
        datetime: new Date(t.datetime),
      }));
    },
  });

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
      setSelectedTransactions([]);
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

  const handleBulkCategoryChange = (category: string) => {
    const selectedIds = selectedTransactions.filter(id => id);
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

  const handleSort = (field: SortField) => {
    setSortConfig({
      field,
      order:
        sortConfig.field === field && sortConfig.order === "asc"
          ? "desc"
          : "asc",
    });
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
    <div className="min-h-screen p-8 max-w-7xl mx-auto space-y-8">
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
          <h1 className="text-3xl font-bold">{importData?.name}</h1>
          <p className="text-muted-foreground mt-1">
            {importData?.completed_count} / {importData?.total_count} transactions categorized
          </p>
        </div>
      </div>

      <div className="space-y-6">
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={selectedTransactions.length === filteredTransactions.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("code")}
                    className="flex items-center gap-2"
                  >
                    Code
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("recipient")}
                    className="flex items-center gap-2"
                  >
                    Recipient
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("amount")}
                    className="flex items-center gap-2"
                  >
                    Amount
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("datetime")}
                    className="flex items-center gap-2"
                  >
                    Date/Time
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("category")}
                    className="flex items-center gap-2"
                  >
                    Category
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Checkbox
                      checked={transaction.id ? selectedTransactions.includes(transaction.id) : false}
                      onCheckedChange={() => transaction.id && toggleSelect(transaction.id)}
                    />
                  </TableCell>
                  <TableCell>{transaction.code}</TableCell>
                  <TableCell>{transaction.recipient}</TableCell>
                  <TableCell>Ksh {transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    {transaction.datetime.toLocaleString()}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Transactions;