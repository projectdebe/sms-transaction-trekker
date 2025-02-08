
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

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

type SortField = "code" | "recipient" | "amount" | "datetime" | "category";
type SortOrder = "asc" | "desc";

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  selectedTransactions: string[];
  sortConfig: { field: SortField; order: SortOrder };
  onSort: (field: SortField) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onUpdateCategory: (ids: string[], category: string) => void;
}

export const TransactionTable = ({
  transactions,
  categories,
  selectedTransactions,
  sortConfig,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onUpdateCategory,
}: TransactionTableProps) => {
  // Calculate total amount
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedTransactions.length === transactions.length}
                onCheckedChange={onToggleSelectAll}
              />
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("code")}
                className="flex items-center gap-2"
              >
                Code
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("recipient")}
                className="flex items-center gap-2"
              >
                Recipient
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("amount")}
                className="flex items-center gap-2"
              >
                Amount
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("datetime")}
                className="flex items-center gap-2"
              >
                Date/Time
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSort("category")}
                className="flex items-center gap-2"
              >
                Category
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                <Checkbox
                  checked={transaction.id ? selectedTransactions.includes(transaction.id) : false}
                  onCheckedChange={() => transaction.id && onToggleSelect(transaction.id)}
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
                    onUpdateCategory([transaction.id], value)
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
          {/* Total row */}
          <TableRow className="font-medium">
            <TableCell />
            <TableCell>Total</TableCell>
            <TableCell />
            <TableCell>Ksh {total.toFixed(2)}</TableCell>
            <TableCell />
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
