import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Imports = () => {
  const navigate = useNavigate();
  
  const { data: imports = [] } = useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">M-PESA Imports</h1>
          <p className="text-muted-foreground mt-1">
            Import and manage your M-PESA transactions
          </p>
        </div>
        <Button
          onClick={() => navigate("/new")}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Import
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.map((imp) => (
              <TableRow
                key={imp.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/import/${imp.id}`)}
              >
                <TableCell className="font-medium">{imp.name}</TableCell>
                <TableCell className="space-y-2">
                  <Progress value={(imp.completed_count / imp.total_count) * 100} />
                  <p className="text-sm text-muted-foreground">
                    {imp.completed_count} / {imp.total_count} transactions categorized
                  </p>
                </TableCell>
                <TableCell>
                  {new Date(imp.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Imports;