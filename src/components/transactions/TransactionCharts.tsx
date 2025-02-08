
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";

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

interface TransactionChartsProps {
  transactions: Transaction[];
  dateRange: DateRange | undefined;
  setDateRange: (date: DateRange | undefined) => void;
}

export const TransactionCharts = ({ transactions, dateRange, setDateRange }: TransactionChartsProps) => {
  const getCategoryData = (transactions: Transaction[]) => {
    const categoryTotals = transactions.reduce((acc: { [key: string]: number }, transaction) => {
      const category = transaction.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + transaction.amount;
      return acc;
    }, {});

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
    }));
  };

  const getTimelineData = (transactions: Transaction[]) => {
    const timelineData = transactions.reduce((acc: { [key: string]: { total: number; categories: { [key: string]: number } } }, transaction) => {
      const date = format(transaction.datetime, 'yyyy-MM-dd');
      const category = transaction.category || 'Uncategorized';
      
      if (!acc[date]) {
        acc[date] = { total: 0, categories: {} };
      }
      
      acc[date].total += transaction.amount;
      acc[date].categories[category] = (acc[date].categories[category] || 0) + transaction.amount;
      
      return acc;
    }, {});

    return Object.entries(timelineData)
      .map(([date, data]) => ({
        date,
        amount: data.total,
        ...data.categories,
        categoryBreakdown: Object.entries(data.categories)
          .sort((a, b) => b[1] - a[1]) // Sort by amount in descending order
          .map(([category, amount]) => ({
            category,
            amount,
          })),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const total = data.amount;
    const breakdown = data.categoryBreakdown;

    return (
      <div className="bg-white p-4 border rounded-lg shadow-lg">
        <p className="font-semibold mb-2">{label}</p>
        <p className="text-sm text-muted-foreground mb-2">
          Total: Ksh {total.toFixed(2)}
        </p>
        <div className="space-y-1">
          {breakdown.map((item: { category: string; amount: number }, index: number) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground mr-4">{item.category}:</span>
              <span className="font-mono">Ksh {item.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transaction Analysis</h2>
        <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-4 border rounded-lg bg-white">
          <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getCategoryData(transactions)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => `Ksh ${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="amount" fill="#4f46e5" name="Amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-4 border rounded-lg bg-white">
          <h2 className="text-lg font-semibold mb-4">Spending Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getTimelineData(transactions)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#4f46e5" 
                name="Amount"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

