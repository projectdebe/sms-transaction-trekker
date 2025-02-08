
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TransactionAnalysis } from "./TransactionAnalysis";

interface TransactionHeaderProps {
  importData: {
    name: string;
    completed_count: number;
    total_count: number;
  } | null;
  transactions: any[];
  importId: string;
}

export const TransactionHeader = ({ importData, transactions, importId }: TransactionHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate("/")}
        className="shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        <h1 className="text-3xl font-bold">{importData?.name}</h1>
        <p className="text-muted-foreground mt-1">
          {importData?.completed_count} / {importData?.total_count} transactions categorized
        </p>
      </div>
      <TransactionAnalysis 
        transactions={transactions} 
        importId={importId}
      />
    </div>
  );
};
