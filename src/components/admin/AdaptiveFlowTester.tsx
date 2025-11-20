import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TestStep {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export const AdaptiveFlowTester = () => {
  const [testing, setTesting] = useState(false);
  const [steps, setSteps] = useState<TestStep[]>([
    { step: 1, name: 'Q1: Problem Description', status: 'pending' },
    { step: 2, name: 'Q1: AI Vertical Analysis', status: 'pending' },
    { step: 3, name: 'Q2: Adaptive Initiative Design', status: 'pending' },
    { step: 4, name: 'Q2: AI Help Adaptation', status: 'pending' },
    { step: 5, name: 'Q3: Adaptive Saturday Crisis', status: 'pending' },
    { step: 6, name: 'Q4: Adaptive Goal Setting', status: 'pending' },
    { step: 7, name: 'Q5: Adaptive Leadership Scenario', status: 'pending' },
    { step: 8, name: 'Complete Assessment Analysis', status: 'pending' },
  ]);

  const updateStep = (stepNum: number, status: TestStep['status'], message?: string, duration?: number) => {
    setSteps(prev => prev.map(s => 
      s.step === stepNum ? { ...s, status, message, duration } : s
    ));
  };

  const runAdaptiveFlowTest = async () => {
    setTesting(true);
    const startTime = Date.now();
    
    try {
      // Step 1: Create test assessment with Q1 response
      updateStep(1, 'running');
      const stepStart = Date.now();
      
      const testEmail = `adaptive-test-${Date.now()}@test.com`;
      const testName = `Adaptive Flow Test ${new Date().toLocaleTimeString()}`;
      
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          user_email: testEmail,
          user_name: testName,
          current_question: 1,
          status: 'in_progress'
        })
        .select()
        .single();

      if (assessmentError || !assessment) {
        updateStep(1, 'error', `Failed to create assessment: ${assessmentError?.message}`);
        toast.error('Test failed at Step 1');
        return;
      }

      // Insert Q1 Part A response
      const q1Problem = "Street dogs are attacking children near Government Higher Secondary School on Gandhi Road. Last month alone, 3 kids were bitten. Parents are scared to send children to school. The municipality ignores our complaints. This is a serious safety crisis affecting 500+ students daily.";
      
      const { error: q1Error } = await supabase
        .from('assessment_responses')
        .insert({
          assessment_id: assessment.id,
          question_number: 1,
          question_text: 'What problem in your community irritates you the most?',
          response_data: {
            part_a: q1Problem,
            part_b: null,
            hasAnalyzed: false
          }
        });

      if (q1Error) {
        updateStep(1, 'error', `Failed to save Q1: ${q1Error.message}`);
        return;
      }

      updateStep(1, 'success', `Created assessment ${assessment.id.substring(0, 8)}...`, Date.now() - stepStart);

      // Step 2: Test AI vertical suggestion
      updateStep(2, 'running');
      const step2Start = Date.now();

      const { data: verticalsData, error: verticalsError } = await supabase.functions.invoke('suggest-verticals', {
        body: { problemDescription: q1Problem }
      });

      if (verticalsError || !verticalsData?.suggestedVerticals) {
        updateStep(2, 'error', `AI vertical suggestion failed: ${verticalsError?.message || 'No suggestions returned'}`);
        return;
      }

      // Update Q1 with vertical selections
      const selectedVerticals = verticalsData.suggestedVerticals.slice(0, 3);
      
      await supabase
        .from('assessment_responses')
        .update({
          response_data: {
            partA: q1Problem,
            partB: selectedVerticals,
            hasAnalyzed: true,
            suggestedVerticals: selectedVerticals
          }
        })
        .eq('assessment_id', assessment.id)
        .eq('question_number', 1);

      updateStep(2, 'success', `Suggested ${verticalsData.suggestedVerticals.length} verticals in ${Date.now() - step2Start}ms`, Date.now() - step2Start);

      // Step 3: Test Q2 adaptation
      updateStep(3, 'running');
      const step3Start = Date.now();

      const { data: q2Data, error: q2Error } = await supabase.functions.invoke('generate-adaptive-question', {
        body: {
          questionNumber: 2,
          previousResponses: {
            q1_part_a: q1Problem,
            q1_verticals: selectedVerticals
          }
        }
      });

      if (q2Error || !q2Data?.adaptedScenario) {
        updateStep(3, 'error', `Q2 adaptation failed: ${q2Error?.message || 'No adapted question'}`);
        return;
      }

      updateStep(3, 'success', `Q2 adapted: "${q2Data.contextSummary.substring(0, 50)}..."`, Date.now() - step3Start);

      // Step 4: Test Q2 AI Help
      updateStep(4, 'running');
      const step4Start = Date.now();

      const { data: aiHelpData, error: aiHelpError } = await supabase.functions.invoke('ai-help-assessment', {
        body: {
          questionNumber: 2,
          questionTitle: 'Initiative Design',
          questionType: 'long-text',
          scenario: q2Data.adaptedScenario,
          adaptedQuestionText: q2Data.adaptedScenario,
          previousResponses: {
            q1_part_a: q1Problem,
            q1_verticals: selectedVerticals
          }
        }
      });

      if (aiHelpError || !aiHelpData?.suggestions) {
        updateStep(4, 'error', `Q2 AI Help failed: ${aiHelpError?.message}`);
        return;
      }

      // Check if suggestions reference the specific problem
      const firstSuggestion = aiHelpData.suggestions[0];
      const suggestionText = firstSuggestion.content.toLowerCase();
      const referencesStreetDogs = suggestionText.includes('street dog') || 
                                   suggestionText.includes('dog') ||
                                   suggestionText.includes('stray');
      
      if (!referencesStreetDogs) {
        updateStep(4, 'error', 'AI Help suggestions do NOT reference the specific street dog problem!');
        return;
      }

      updateStep(4, 'success', `AI Help correctly adapted - mentions problem in first suggestion`, Date.now() - step4Start);

      // Save Q2 response
      await supabase
        .from('assessment_responses')
        .insert({
          assessment_id: assessment.id,
          question_number: 2,
          question_text: 'Initiative Design',
          response_data: {
            response: "To address the street dog attacks near Gandhi Road school, I'll launch 'Safe Streets for Students' - a 6-month initiative partnering with the municipality, school, and animal welfare groups. We'll set up feeding stations away from school routes, conduct humane sterilization camps for 200+ dogs, install 20 warning signboards, train 50 student 'safety ambassadors', and create a 24/7 emergency response WhatsApp group. Budget: ₹30,000 sterilization, ₹15,000 awareness materials, ₹5,000 feeding stations. This will reach 10,000+ residents and eliminate attacks within 4 months."
          },
          adapted_question_text: q2Data.adaptedScenario,
          adaptation_context: {
            contextSummary: q2Data.contextSummary,
            wasAdapted: true
          }
        });

      // Step 5: Test Q3 adaptation
      updateStep(5, 'running');
      const step5Start = Date.now();

      const { data: q3Data, error: q3Error } = await supabase.functions.invoke('generate-adaptive-question', {
        body: {
          questionNumber: 3,
          previousResponses: {
            q1_part_a: q1Problem,
            q2_initiative: "Safe Streets for Students initiative"
          }
        }
      });

      if (q3Error || !q3Data?.adaptedScenario) {
        updateStep(5, 'error', `Q3 adaptation failed: ${q3Error?.message}`);
        return;
      }

      updateStep(5, 'success', `Q3 adapted with initiative context`, Date.now() - step5Start);

      // Save Q3 response
      await supabase
        .from('assessment_responses')
        .insert({
          assessment_id: assessment.id,
          question_number: 3,
          question_text: 'Saturday Emergency Response',
          response_data: {
            response: "Yes, I'll come. This campaign matters - those kids' safety can't wait. I'll tell my family I need 3-4 hours for urgent community work. The event tomorrow is critical for getting municipality support."
          },
          adapted_question_text: q3Data.adaptedScenario,
          adaptation_context: {
            contextSummary: q3Data.contextSummary,
            wasAdapted: true
          }
        });

      // Step 6: Test Q4 adaptation
      updateStep(6, 'running');
      const step6Start = Date.now();

      const { data: q4Data, error: q4Error } = await supabase.functions.invoke('generate-adaptive-question', {
        body: {
          questionNumber: 4,
          previousResponses: {
            q1_part_a: q1Problem,
            q2_initiative: "Safe Streets for Students initiative"
          }
        }
      });

      if (q4Error || !q4Data?.adaptedScenario) {
        updateStep(6, 'error', `Q4 adaptation failed: ${q4Error?.message}`);
        return;
      }

      updateStep(6, 'success', `Q4 adapted with goal-setting context`, Date.now() - step6Start);

      // Save Q4 response
      await supabase
        .from('assessment_responses')
        .insert({
          assessment_id: assessment.id,
          question_number: 4,
          question_text: 'Your 2026 Yi Erode Goal',
          response_data: {
            response: "In 2026, I want to make Erode the first 'Stray-Safe City' in Tamil Nadu - zero dog attacks reported in 2026. I'll scale Safe Streets model to all 60 wards, train 500 youth volunteers, partner with 10 NGOs, and secure ₹50 lakhs municipal funding. Success means 5,000+ dogs sterilized, 100,000+ residents educated, and our model adopted by 5 other Tamil Nadu cities. Challenges: coordinating across 60 wards, maintaining volunteer motivation, proving long-term impact data to convince officials."
          },
          adapted_question_text: q4Data.adaptedScenario,
          adaptation_context: {
            contextSummary: q4Data.contextSummary,
            wasAdapted: true
          }
        });

      // Step 7: Test Q5 adaptation
      updateStep(7, 'running');
      const step7Start = Date.now();

      const { data: q5Data, error: q5Error } = await supabase.functions.invoke('generate-adaptive-question', {
        body: {
          questionNumber: 5,
          previousResponses: {
            q2_initiative: "Safe Streets for Students initiative"
          }
        }
      });

      if (q5Error || !q5Data?.adaptedScenario) {
        updateStep(7, 'error', `Q5 adaptation failed: ${q5Error?.message}`);
        return;
      }

      updateStep(7, 'success', `Q5 adapted with leadership context`, Date.now() - step7Start);

      // Save Q5 response
      await supabase
        .from('assessment_responses')
        .insert({
          assessment_id: assessment.id,
          question_number: 5,
          question_text: 'Team Deadline Scenario',
          response_data: {
            response: "I'll call the team together immediately and investigate why we're behind. If it's my planning, I own it. If it's external blocks, we problem-solve together. I'll stay late with them to catch up, not just delegate and leave."
          },
          adapted_question_text: q5Data.adaptedScenario,
          adaptation_context: {
            contextSummary: q5Data.contextSummary,
            wasAdapted: true
          }
        });

      // Step 8: Complete assessment and trigger analysis
      updateStep(8, 'running');
      const step8Start = Date.now();

      await supabase
        .from('assessments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          current_question: 6
        })
        .eq('id', assessment.id);

      // Trigger analysis
      const { error: analysisError } = await supabase.functions.invoke('analyze-assessment', {
        body: { assessmentId: assessment.id }
      });

      if (analysisError) {
        updateStep(8, 'error', `Analysis failed: ${analysisError.message}`);
        return;
      }

      updateStep(8, 'success', `Assessment analyzed successfully`, Date.now() - step8Start);

      const totalTime = Date.now() - startTime;
      toast.success(`✅ Complete adaptive flow test passed in ${(totalTime / 1000).toFixed(1)}s`, {
        description: `Assessment ID: ${assessment.id.substring(0, 8)}...`
      });

    } catch (error: any) {
      console.error('Adaptive flow test error:', error);
      toast.error('Test failed with unexpected error');
      
      const failedStep = steps.findIndex(s => s.status === 'running');
      if (failedStep !== -1) {
        updateStep(failedStep + 1, 'error', error.message);
      }
    } finally {
      setTesting(false);
    }
  };

  const getStepIcon = (status: TestStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TestStep['status']) => {
    const variants: Record<TestStep['status'], any> = {
      pending: 'secondary',
      running: 'default',
      success: 'default',
      error: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adaptive Flow Tester</CardTitle>
        <CardDescription>
          Comprehensive end-to-end test of the complete adaptive assessment flow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This test creates a complete assessment walking through all 5 questions with adaptive AI at each step.
            It verifies that Q2 AI Help explicitly references the Q1 problem (street dogs).
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runAdaptiveFlowTest} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Test...
            </>
          ) : (
            'Run Complete Adaptive Flow Test'
          )}
        </Button>

        <div className="space-y-2">
          {steps.map((step) => (
            <div
              key={step.step}
              className="flex items-center justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3 flex-1">
                {getStepIcon(step.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Step {step.step}</span>
                    <span className="text-sm text-muted-foreground">{step.name}</span>
                  </div>
                  {step.message && (
                    <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {step.duration && (
                  <span className="text-xs text-muted-foreground">{step.duration}ms</span>
                )}
                <Badge variant={getStatusBadge(step.status)}>
                  {step.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
