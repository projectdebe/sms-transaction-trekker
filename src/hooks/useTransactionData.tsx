
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";

export type SortField = "code" | "recipient" | "amount" | "datetime" | "category";
export type SortOrder = "asc" | "desc";

export interface Transaction {
  id?: string;
  code: string;
  recipient: string;
  amount: number;
  datetime: Date;
  category?: string | null;
  import_id?: string | null;
  user_id?: string | null;
}

export const useTransactionData = (importId: string) => {
  const queryClient = useQueryClient();
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
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

      if (error) {
        console.error("Error fetching import:", error);
        throw error;
      }
      console.log("Import data:", data);
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

      if (error) {
        console.error("Error fetching categories:", error);
        throw error;
      }
      console.log("Categories:", data);
      return data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions", importId],
    queryFn: async () => {
      console.log("Fetching transactions for import:", importId);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("import_id", importId)
        .order("datetime", { ascending: false })
        .limit(2000); // Increased limit to handle all transactions

      if (error) {
        console.error("Error fetching transactions:", error);
        throw error;
      }
      console.log("Transactions count:", data?.length);
      console.log("First few transactions:", data?.slice(0, 3));
      return data.map((t: any) => ({
        ...t,
        datetime: new Date(t.datetime),
      }));
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ ids, category }: { ids: string[]; category: string }) => {
      console.log("Updating transactions:", { ids, category });
      const { error } = await supabase
        .from("transactions")
        .update({ category })
        .in('id', ids);

      if (error) {
        console.error("Error updating transactions:", error);
        throw error;
      }
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

  return {
    importData,
    categories,
    transactions,
    selectedTransactions,
    setSelectedTransactions,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    dateRange,
    setDateRange,
    sortConfig,
    setSortConfig,
    updateTransactionMutation,
  };
};
