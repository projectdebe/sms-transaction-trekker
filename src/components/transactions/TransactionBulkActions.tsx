
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
}

interface TransactionBulkActionsProps {
  selectedCount: number;
  categories: Category[];
  onBulkCategoryChange: (category: string) => void;
}

export const TransactionBulkActions = ({
  selectedCount,
  categories,
  onBulkCategoryChange,
}: TransactionBulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
      <span className="text-sm text-muted-foreground">
        {selectedCount} selected
      </span>
      <Select onValueChange={onBulkCategoryChange}>
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
  );
};
