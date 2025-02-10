import { useParams } from "react-router-dom";
import { startOfDay, endOfDay } from "date-fns";
import { TransactionCharts } from "@/components/transactions/TransactionCharts";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { TransactionHeader } from "@/components/transactions/TransactionHeader";
import { TransactionFilters } from "@/components/transactions/TransactionFilters";
import { TransactionBulkActions } from "@/components/transactions/TransactionBulkActions";
import { useTransactionData } from "@/hooks/useTransactionData";
import { toast } from "@/components/ui/use-toast";

const Transactions = () => {
  const { importId } = useParams();
  if (!importId) return null;
  
  const {
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
  } = useTransactionData(importId);

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
    updateTransactionMutation.mutate({ 
      ids: selectedIds, 
      updates: { category } 
    });
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    updateTransactionMutation.mutate({ 
      ids: [id], 
      updates: { notes } 
    });
  };

  const toggleSelectAll = (filteredTransactions: any[]) => {
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

  const handleSort = (field: any) => {
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

      const matchesDateRange =
        !dateRange?.from || !dateRange?.to ||
        (transaction.datetime >= startOfDay(dateRange.from) &&
         transaction.datetime <= endOfDay(dateRange.to));

      return matchesSearch && matchesCategory && matchesDateRange;
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
      <TransactionHeader 
        importData={importData} 
        transactions={filteredTransactions}
        importId={importId}
      />

      <TransactionCharts 
        transactions={filteredTransactions}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      <div className="space-y-6">
        <TransactionFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          categories={categories}
        />

        <TransactionBulkActions
          selectedCount={selectedTransactions.length}
          categories={categories}
          onBulkCategoryChange={handleBulkCategoryChange}
        />

        <TransactionTable
          transactions={filteredTransactions}
          categories={categories}
          selectedTransactions={selectedTransactions}
          sortConfig={sortConfig}
          onSort={handleSort}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={() => toggleSelectAll(filteredTransactions)}
          onUpdateCategory={(ids, category) => 
            updateTransactionMutation.mutate({ ids, updates: { category } })
          }
          onUpdateNotes={handleUpdateNotes}
        />
      </div>
    </div>
  );
};

export default Transactions;
