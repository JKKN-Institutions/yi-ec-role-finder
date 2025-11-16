import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, AlertTriangle, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TestAccount {
  email: string;
  password: string;
  roles: string[];
  success: boolean;
  error?: string;
}

export const TestDataSeeder = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TestAccount[]>([]);
  const { toast } = useToast();

  const seedTestData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seed-test-data');

      if (error) throw error;

      if (data?.accounts) {
        setResults(data.accounts);
        toast({
          title: "Test data seeded successfully",
          description: `Created ${data.accounts.filter((a: TestAccount) => a.success).length} test accounts`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error seeding test data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data Seeder
        </CardTitle>
        <CardDescription>
          Generate demo admin accounts with known credentials for development and testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Development Only!</strong> These test accounts have known passwords and should NEVER be used in production environments.
          </AlertDescription>
        </Alert>

        <Button onClick={seedTestData} disabled={loading}>
          {loading ? "Seeding..." : "Seed Test Accounts"}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Created Test Accounts:</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((account, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-sm">
                      {account.email}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 h-6 w-6"
                        onClick={() => copyToClipboard(account.email)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {account.password}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-2 h-6 w-6"
                        onClick={() => copyToClipboard(account.password)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {account.roles?.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {account.success ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
