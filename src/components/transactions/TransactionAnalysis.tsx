
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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
  importId: string;
}

export const TransactionAnalysis = ({ transactions, importId }: TransactionAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const { data: analysisReport, refetch, isLoading } = useQuery({
    queryKey: ['analysis', importId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_reports')
        .select('*')
        .eq('import_id', importId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-transactions', {
        body: { transactions, importId },
      });

      if (error) {
        console.error('Analysis error:', error);
        throw error;
      }

      await refetch();
      setShowAnalysis(true);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze transactions. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!analysisReport?.pdf_path) {
      toast.error('No PDF available for download');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('analysis_pdfs')
        .download(analysisReport.pdf_path);

      if (error) throw error;

      // Create a download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = analysisReport.pdf_path.split('/').pop() || 'analysis.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download PDF');
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
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

        {analysisReport && (
          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        )}
      </div>

      <Dialog open={showAnalysis} onOpenChange={setShowAnalysis}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Analysis</DialogTitle>
            <DialogDescription>
              AI-powered insights and recommendations based on your transaction data.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4 whitespace-pre-wrap">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : analysisReport?.analysis_text ? (
              analysisReport.analysis_text
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No analysis available. Please run the analysis first.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
