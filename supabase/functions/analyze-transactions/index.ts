import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface AnalysisData {
  categoryTotals: { [key: string]: number };
  monthlyTotals: { [key: string]: number };
  topRecipients: { recipient: string; amount: number }[];
  totalSpent: number;
  transactionCount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactions, importId } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from('analysis_reports')
      .select('*')
      .eq('import_id', importId)
      .single();

    if (existingAnalysis) {
      return new Response(
        JSON.stringify(existingAnalysis),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare summarized analysis data
    const analysisData: AnalysisData = {
      categoryTotals: {},
      monthlyTotals: {},
      topRecipients: [],
      totalSpent: 0,
      transactionCount: 0,
    };

    // Process transactions
    const recipientTotals: { [key: string]: number } = {};

    transactions.forEach((t: any) => {
      // Category totals
      const category = t.category || 'Uncategorized';
      analysisData.categoryTotals[category] = (analysisData.categoryTotals[category] || 0) + t.amount;

      // Monthly totals
      const monthKey = new Date(t.datetime).toISOString().slice(0, 7);
      analysisData.monthlyTotals[monthKey] = (analysisData.monthlyTotals[monthKey] || 0) + t.amount;

      // Recipient totals
      recipientTotals[t.recipient] = (recipientTotals[t.recipient] || 0) + t.amount;

      // Total spent
      analysisData.totalSpent += t.amount;
      analysisData.transactionCount++;
    });

    // Get top 10 recipients by amount
    analysisData.topRecipients = Object.entries(recipientTotals)
      .map(([recipient, amount]) => ({ recipient, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Prepare prompt for DeepSeek
    const prompt = `Please analyze this financial data and provide insights and recommendations:

Transaction Summary:
- Total Spent: ${analysisData.totalSpent.toFixed(2)} KSH
- Number of Transactions: ${analysisData.transactionCount}

Category Breakdown:
${Object.entries(analysisData.categoryTotals)
  .map(([category, amount]) => `${category}: ${amount.toFixed(2)} KSH`)
  .join('\n')}

Monthly Spending:
${Object.entries(analysisData.monthlyTotals)
  .map(([month, amount]) => `${month}: ${amount.toFixed(2)} KSH`)
  .join('\n')}

Top Recipients:
${analysisData.topRecipients
  .map(({ recipient, amount }) => `${recipient}: ${amount.toFixed(2)} KSH`)
  .join('\n')}

Please provide:
1. Key spending patterns and trends
2. Areas where spending could be optimized
3. Specific recommendations for better financial management
4. Any concerning patterns that should be addressed
Keep the analysis concise and actionable.`;

    // Get DeepSeek API key from environment
    const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    // Call DeepSeek API
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        model: 'deepseek-chat',
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get analysis from DeepSeek');
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices?.[0]?.message?.content || 'No analysis available';

    // Generate PDF
    const pdf = new jsPDF();
    const splitText = pdf.splitTextToSize(analysisText, 180);
    
    pdf.text('Transaction Analysis Report', 20, 20);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
    pdf.text(splitText, 20, 50);

    // Convert PDF to Uint8Array
    const pdfBytes = pdf.output('arraybuffer');
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    // Upload PDF to storage
    const pdfFileName = `analysis_${importId}_${new Date().toISOString()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('analysis_pdfs')
      .upload(pdfFileName, pdfBlob, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw uploadError;
    }

    // Create analysis report record
    const { data: reportData, error: reportError } = await supabase
      .from('analysis_reports')
      .insert({
        import_id: importId,
        analysis_text: analysisText,
        pdf_path: pdfFileName,
      })
      .select()
      .single();

    if (reportError) {
      throw reportError;
    }

    return new Response(
      JSON.stringify(reportData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
