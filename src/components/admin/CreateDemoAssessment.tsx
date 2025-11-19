import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const CreateDemoAssessment = () => {
  const [creating, setCreating] = useState(false);

  const createDemo = async () => {
    setCreating(true);
    try {
      // Step 1: Create assessment
      const { data: assessment, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          user_name: "Demo Candidate - Adaptive Flow",
          user_email: "demo.adaptive@example.com",
          status: "completed",
          completed_at: new Date().toISOString(),
          current_question: 5,
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Step 2: Create responses with realistic data that triggers adaptations
      const responses = [
        {
          assessment_id: assessment.id,
          question_number: 1,
          question_text: "Personal Irritation → Vertical Selection",
          response_data: {
            partA: "I'm deeply frustrated by the waste management crisis in my neighborhood in Erode. Every morning, I see overflowing garbage bins on the streets, plastic waste clogging drains, and residents dumping trash in empty plots. The municipal collection is irregular, and there's zero awareness about segregation. What really pushed me to act was seeing children playing near piles of rotting garbage during the monsoon season. The smell, the health hazards, the complete apathy - it's unacceptable. We deserve clean streets and a healthy environment.",
            priority1: "env-conservation-id",
            priority2: "public-health-id",
            priority3: "youth-engagement-id",
            selectedVerticals: [
              { id: "env-conservation-id", name: "Environmental Conservation" },
              { id: "public-health-id", name: "Public Health" },
              { id: "youth-engagement-id", name: "Youth Engagement" }
            ],
            hasAnalyzed: true,
            suggestedVerticals: ["env-conservation-id", "public-health-id", "youth-engagement-id"]
          }
        },
        {
          assessment_id: assessment.id,
          question_number: 2,
          question_text: "Initiative Design",
          response_data: {
            response: "I would launch a 'Clean Erode Challenge' - a 6-month community-driven waste segregation and awareness campaign. Month 1-2: Train 50 youth volunteers as 'Waste Warriors' who will conduct door-to-door awareness in 10 neighborhoods (targeting 5,000 households). Month 3-4: Set up 15 community segregation points with color-coded bins and daily monitoring. Partner with local schools to integrate waste education into curriculum, reaching 3,000 students. Month 5-6: Organize weekly 'neighborhood clean-up drives' with rewards for the cleanest streets, engaging local businesses as sponsors. Use ₹30,000 for training materials, bins, and volunteer stipends; ₹15,000 for visibility campaigns (posters, social media, local radio spots); ₹5,000 for recognition events. The specific change: 70% of households in target areas practicing segregation, 10,000+ people directly engaged, and a sustainable waste management model that can be replicated across Erode."
          },
          adapted_question_text: "You described being irritated by waste management issues in your neighborhood, and you selected Environmental Conservation, Public Health, and Youth Engagement as your focus areas. Yi Erode gives you 6 months and ₹50,000 to design an initiative addressing waste management through these three verticals. How would you reach 10,000+ people and create lasting change?",
          adaptation_context: {
            contextSummary: "waste management issues",
            wasAdapted: true,
            adaptedAt: new Date().toISOString()
          }
        },
        {
          assessment_id: assessment.id,
          question_number: 3,
          question_text: "Saturday Emergency Response",
          response_data: {
            response: "I'd be honest with my family first - 'I need to help with something important for the campaign, I'll be back in 4 hours.' Then I'd call my vertical head back and say: 'I'm coming, but let me quickly check what exactly needs to be done so I can prepare.' On the way, I'd message our volunteer group to see if anyone else is available to join - many hands make light work. At the office, I'd prioritize the most critical tasks for tomorrow's launch - if we need 100 posters printed and materials organized, I'd focus on that. I'd also think about what can be delegated or done early morning. I believe in commitment to the cause, but I'd also be strategic about the time - if we can finish in 3 hours instead of 4, that's better for everyone. The campaign matters to me deeply, so yes, I'd go, but I'd make sure it's productive time."
          },
          adapted_question_text: "It's Saturday, 6 PM. You're with family when your Environmental Conservation vertical head calls: 'We need urgent help preparing for tomorrow's launch of your community waste segregation campaign. Can you come to the office now for 3-4 hours to finalize materials?' What's your honest response?",
          adaptation_context: {
            contextSummary: "community waste segregation campaign",
            wasAdapted: true,
            adaptedAt: new Date().toISOString()
          }
        },
        {
          assessment_id: assessment.id,
          question_number: 4,
          question_text: "Your Most Significant Achievement",
          response_data: {
            response: "Last year, I organized a 'Green Campus Initiative' at my college where we achieved 80% plastic reduction in 4 months. The biggest obstacle was convincing 200+ students and 50 faculty to change their habits - many thought it was impractical. I started by placing 30 stainless steel water stations and banning plastic bottles in the canteen, which created immediate pushback. To overcome this, I formed a 15-member student committee, ran a viral social media campaign showing our daily plastic waste (it was shocking!), and got the principal's public support. We faced vendor resistance when trying to eliminate plastic packaging, so we helped them find affordable biodegradable alternatives. The outcome: we eliminated 50,000+ plastic bottles, saved the college ₹80,000 annually, and our model was adopted by 3 other institutions in Tamil Nadu. Most importantly, I learned that systemic change requires persistence, stakeholder buy-in, and making the 'right choice' also the 'easy choice.'"
          },
          adapted_question_text: "You've shown passion for waste management issues and designed an initiative involving community organizing, environmental action, and youth mobilization. Now share a past achievement that demonstrates you can actually execute complex plans - ideally related to community organizing, environmental action, or mobilizing others. What obstacles did you overcome?",
          adaptation_context: {
            contextSummary: "community organizing, environmental action, youth mobilization",
            wasAdapted: true,
            adaptedAt: new Date().toISOString()
          }
        },
        {
          assessment_id: assessment.id,
          question_number: 5,
          question_text: "Team Deadline Scenario",
          response_data: {
            leadershipStyle: "leader"
          },
          adapted_question_text: "Your team working on the community waste segregation campaign misses the deadline for recruiting 100 volunteers. The public launch is in 3 days, and you need volunteers to staff 10 collection points. What's your first instinct?",
          adaptation_context: {
            contextSummary: "community waste segregation campaign",
            wasAdapted: true,
            adaptedAt: new Date().toISOString()
          }
        }
      ];

      for (const response of responses) {
        const { error: responseError } = await supabase
          .from("assessment_responses")
          .insert(response);

        if (responseError) throw responseError;
      }

      // Step 3: Trigger AI analysis
      const { error: analysisError } = await supabase.functions.invoke("analyze-assessment", {
        body: { assessmentId: assessment.id },
      });

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        toast.warning("Assessment created but analysis pending");
      }

      toast.success(`Demo assessment created! View in comparison or candidates page.`);
      
    } catch (error: any) {
      console.error("Error creating demo:", error);
      toast.error(`Failed to create demo: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Adaptive Assessment Demo
        </CardTitle>
        <CardDescription>
          Create a complete demo assessment showcasing how questions Q2-Q5 adapt based on previous responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
          <p className="font-medium">This demo includes:</p>
          <ul className="list-disc ml-5 space-y-1 text-muted-foreground">
            <li><strong>Q1:</strong> Waste management problem with Environmental Conservation, Public Health, and Youth Engagement verticals</li>
            <li><strong>Q2:</strong> Initiative design adapted to reference the specific problem and selected verticals</li>
            <li><strong>Q3:</strong> Saturday crisis adapted to mention the waste segregation campaign</li>
            <li><strong>Q4:</strong> Achievement question adapted to suggest relevant community organizing skills</li>
            <li><strong>Q5:</strong> Leadership scenario adapted to the campaign context with specific deadline</li>
          </ul>
        </div>

        <Button 
          onClick={createDemo} 
          disabled={creating}
          className="w-full"
        >
          {creating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Demo Assessment...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Create Adaptive Demo Assessment
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          The demo will be created with email: <code>demo.adaptive@example.com</code>
        </p>
      </CardContent>
    </Card>
  );
};
