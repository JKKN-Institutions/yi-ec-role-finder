import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search, FileQuestion } from "lucide-react";
import { Navbar } from "@/components/Navbar";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto">
          <Card className="border-2">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <FileQuestion className="h-10 w-10 text-primary" />
              </div>
              <div>
                <CardTitle className="text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  404
                </CardTitle>
                <CardDescription className="text-xl mt-2">Page Not Found</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">
                The page you're looking for doesn't exist or has been moved. Here are some helpful links:
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={() => navigate("/")} variant="outline" className="h-auto py-4">
                  <div className="flex flex-col items-center gap-2">
                    <Home className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Home Page</div>
                      <div className="text-xs text-muted-foreground">Start assessment</div>
                    </div>
                  </div>
                </Button>
                
                <Button onClick={() => navigate("/login")} variant="outline" className="h-auto py-4">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-6 w-6" />
                    <div>
                      <div className="font-semibold">Admin Login</div>
                      <div className="text-xs text-muted-foreground">Access dashboard</div>
                    </div>
                  </div>
                </Button>
              </div>
              
              <div className="flex gap-4 justify-center pt-4 border-t">
                <Button onClick={() => navigate(-1)} variant="ghost">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Go Back
                </Button>
                <Button onClick={() => navigate("/")}>
                  <Home className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
