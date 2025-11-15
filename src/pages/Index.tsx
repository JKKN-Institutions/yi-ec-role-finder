import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { Target } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
});

const Index = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartAssessment = async () => {
    try {
      setIsSubmitting(true);
      const validated = emailSchema.parse({ email, name });

      const { data: assessment, error } = await supabase
        .from("assessments")
        .insert({
          user_email: validated.email,
          user_name: validated.name,
          status: "in_progress",
          current_question: 1,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/assessment/${assessment.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("Failed to start assessment. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="relative">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">AI-Powered Assessment</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Discover Your Perfect
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mt-2">
                EC Role
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              AI-powered assessment to match you with the right Executive Committee position based on your skills and motivation
            </p>

            <Button 
              onClick={() => setShowModal(true)} 
              size="lg"
              className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all"
            >
              Start Assessment
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Your Assessment</DialogTitle>
            <DialogDescription>
              Enter your details to begin the EC role assessment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleStartAssessment} 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Starting..." : "Continue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;