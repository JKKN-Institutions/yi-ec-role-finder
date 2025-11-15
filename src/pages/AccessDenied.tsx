import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Home, LogIn } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2 border-destructive">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="h-10 w-10 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-4xl font-bold">Access Denied</CardTitle>
                <CardDescription className="text-lg mt-2">
                  You don't have permission to access this page
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">
                This page requires admin privileges. If you believe you should have access, please contact your administrator.
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button onClick={() => navigate("/")} variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
                <Button onClick={() => navigate("/login")}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccessDenied;
