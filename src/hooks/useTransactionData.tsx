
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
