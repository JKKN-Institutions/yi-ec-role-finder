import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TestTube, Check, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const TestAssessmentSeeder = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleSeedData = async () => {
    setIsSeeding(true);
    setResults(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('seed-test-assessments');

      if (error) {
        console.error('Seeding error:', error);
        toast.error('Failed to seed test data: ' + error.message);
        return;
      }

      setResults(data);
      toast.success(`Successfully created ${data.assessments.length} test assessments!`);
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Failed to seed test data. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Assessment Generator
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generate sample assessments with realistic responses to test the 4D scoring system
            </p>
          </div>
          <Button 
            onClick={handleSeedData}
            disabled={isSeeding}
            size="sm"
          >
            {isSeeding ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <TestTube className="w-4 h-4 mr-2" />
                Generate Test Data
              </>
            )}
          </Button>
        </div>

        {isSeeding && (
          <Alert>
            <Loader2 className="w-4 h-4 animate-spin" />
            <AlertDescription>
              Creating test assessments and running 4D analysis... This may take 1-2 minutes.
            </AlertDescription>
          </Alert>
        )}

        {results && (
          <div className="space-y-3">
            <Alert className="border-green-200 bg-green-50">
              <Check className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {results.message}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Created Assessments:</h4>
              <div className="space-y-2">
                {results.assessments.map((assessment: any, index: number) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50 text-sm"
                  >
                    <div>
                      <div className="font-medium">{assessment.name}</div>
                      <div className="text-xs text-muted-foreground">{assessment.profile}</div>
                    </div>
                    {assessment.analyzed ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <X className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              View these assessments in the Candidates page to see their 4D scores.
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p className="font-medium">Test Profiles Generated:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>High Performer - Chair/Co-Chair Material (PO≥70, IR≥60, WILL≥65, SKILL≥60)</li>
            <li>Vertical Lead Material (PO≥60, IR≥50, WILL≥55, SKILL≥50)</li>
            <li>EC Member Material (PO≥50, IR≥40, WILL≥50, SKILL≥45)</li>
            <li>Advisor/Specialist Material (high IR or SKILL)</li>
            <li>Developing Candidate (baseline scores)</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
