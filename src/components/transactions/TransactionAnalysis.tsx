
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Transaction {
  id?: string;
  code: string;
  recipient: string;
  amount: number;
  datetime: Date;
  category?: string | null;
}

interface TransactionAnalysisProps {
  transactions: Transaction[];
}

export const TransactionAnalysis = ({ transactions }: TransactionAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-transactions', {
        body: { transactions },
      });

      if (error) throw error;

      // Extract the analysis text from the DeepSeek response
      const analysisText = data.choices?.[0]?.message?.content || 'No analysis available';
      setAnalysis(analysisText);
      setShowAnalysis(true);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze transactions');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Button 
        onClick={handleAnalyze}
        disabled={isAnalyzing || transactions.length === 0}
        className="ml-auto"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          'Run AI Analysis'
        )}
      </Button>

      <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Analysis</DialogTitle>
            <DialogDescription>
              AI-powered insights and recommendations based on your transaction data.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4 whitespace-pre-wrap">
            {analysis}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
