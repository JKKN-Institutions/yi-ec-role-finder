import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Sparkles, Clock, CheckCircle2, XCircle, Brain, Zap } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type AnalyticsData = {
  id: string;
  assessment_id: string;
  question_number: number;
  was_adapted: boolean;
  adaptation_success: boolean | null;
  fallback_used: boolean | null;
  adaptation_time_ms: number | null;
  ai_help_used: boolean | null;
  ai_help_accepted: boolean | null;
  response_completed: boolean;
  response_length: number | null;
  time_to_complete_seconds: number | null;
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

const AdminAdaptiveAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('adaptation_analytics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate metrics
  const totalResponses = analytics.length;
  const adaptedQuestions = analytics.filter(a => a.was_adapted);
  const adaptationSuccessRate = adaptedQuestions.length > 0
    ? (adaptedQuestions.filter(a => a.adaptation_success).length / adaptedQuestions.length) * 100
    : 0;
  
  const aiHelpUsed = analytics.filter(a => a.ai_help_used);
  const aiHelpAcceptanceRate = aiHelpUsed.length > 0
    ? (aiHelpUsed.filter(a => a.ai_help_accepted).length / aiHelpUsed.length) * 100
    : 0;

  const avgAdaptationTime = adaptedQuestions.length > 0
    ? adaptedQuestions.reduce((sum, a) => sum + (a.adaptation_time_ms || 0), 0) / adaptedQuestions.length
    : 0;

  const avgResponseLength = analytics.filter(a => a.response_length !== null).length > 0
    ? analytics.reduce((sum, a) => sum + (a.response_length || 0), 0) / analytics.filter(a => a.response_length !== null).length
    : 0;

  const avgTimeToComplete = analytics.filter(a => a.time_to_complete_seconds !== null).length > 0
    ? analytics.reduce((sum, a) => sum + (a.time_to_complete_seconds || 0), 0) / analytics.filter(a => a.time_to_complete_seconds !== null).length
    : 0;

  // Question-wise data
  const questionData = [2, 3, 4, 5].map(qNum => {
    const qAnalytics = analytics.filter(a => a.question_number === qNum);
    const adapted = qAnalytics.filter(a => a.was_adapted);
    const aiUsed = qAnalytics.filter(a => a.ai_help_used);
    
    return {
      question: `Q${qNum}`,
      total: qAnalytics.length,
      adapted: adapted.length,
      adaptationSuccess: adapted.filter(a => a.adaptation_success).length,
      aiHelpUsed: aiUsed.length,
      avgResponseLength: qAnalytics.filter(a => a.response_length).length > 0
        ? qAnalytics.reduce((sum, a) => sum + (a.response_length || 0), 0) / qAnalytics.filter(a => a.response_length).length
        : 0,
      avgTimeToComplete: qAnalytics.filter(a => a.time_to_complete_seconds).length > 0
        ? qAnalytics.reduce((sum, a) => sum + (a.time_to_complete_seconds || 0), 0) / qAnalytics.filter(a => a.time_to_complete_seconds).length
        : 0,
    };
  });

  // Adaptation vs Non-Adaptation comparison
  const adaptedData = analytics.filter(a => a.was_adapted && a.response_length !== null);
  const nonAdaptedData = analytics.filter(a => !a.was_adapted && a.response_length !== null);
  
  const comparisonData = [
    {
      type: 'Adapted',
      avgLength: adaptedData.length > 0 ? adaptedData.reduce((sum, a) => sum + (a.response_length || 0), 0) / adaptedData.length : 0,
      avgTime: adaptedData.filter(a => a.time_to_complete_seconds).length > 0
        ? adaptedData.reduce((sum, a) => sum + (a.time_to_complete_seconds || 0), 0) / adaptedData.filter(a => a.time_to_complete_seconds).length
        : 0,
      count: adaptedData.length,
    },
    {
      type: 'Non-Adapted',
      avgLength: nonAdaptedData.length > 0 ? nonAdaptedData.reduce((sum, a) => sum + (a.response_length || 0), 0) / nonAdaptedData.length : 0,
      avgTime: nonAdaptedData.filter(a => a.time_to_complete_seconds).length > 0
        ? nonAdaptedData.reduce((sum, a) => sum + (a.time_to_complete_seconds || 0), 0) / nonAdaptedData.filter(a => a.time_to_complete_seconds).length
        : 0,
      count: nonAdaptedData.length,
    },
  ];

  // AI Help impact data
  const aiHelpData = analytics.filter(a => a.response_length !== null).map(a => ({
    aiHelp: a.ai_help_used ? 'With AI Help' : 'Without AI Help',
    responseLength: a.response_length || 0,
    timeToComplete: a.time_to_complete_seconds || 0,
  }));

  const aiHelpComparison = [
    {
      type: 'With AI Help',
      avgLength: aiHelpData.filter(a => a.aiHelp === 'With AI Help').length > 0
        ? aiHelpData.filter(a => a.aiHelp === 'With AI Help').reduce((sum, a) => sum + a.responseLength, 0) / aiHelpData.filter(a => a.aiHelp === 'With AI Help').length
        : 0,
      avgTime: aiHelpData.filter(a => a.aiHelp === 'With AI Help' && a.timeToComplete > 0).length > 0
        ? aiHelpData.filter(a => a.aiHelp === 'With AI Help').reduce((sum, a) => sum + a.timeToComplete, 0) / aiHelpData.filter(a => a.aiHelp === 'With AI Help' && a.timeToComplete > 0).length
        : 0,
      count: aiHelpData.filter(a => a.aiHelp === 'With AI Help').length,
    },
    {
      type: 'Without AI Help',
      avgLength: aiHelpData.filter(a => a.aiHelp === 'Without AI Help').length > 0
        ? aiHelpData.filter(a => a.aiHelp === 'Without AI Help').reduce((sum, a) => sum + a.responseLength, 0) / aiHelpData.filter(a => a.aiHelp === 'Without AI Help').length
        : 0,
      avgTime: aiHelpData.filter(a => a.aiHelp === 'Without AI Help' && a.timeToComplete > 0).length > 0
        ? aiHelpData.filter(a => a.aiHelp === 'Without AI Help').reduce((sum, a) => sum + a.timeToComplete, 0) / aiHelpData.filter(a => a.aiHelp === 'Without AI Help' && a.timeToComplete > 0).length
        : 0,
      count: aiHelpData.filter(a => a.aiHelp === 'Without AI Help').length,
    },
  ];

  // Pie chart data
  const adaptationDistribution = [
    { name: 'Successfully Adapted', value: adaptedQuestions.filter(a => a.adaptation_success).length },
    { name: 'Fallback Used', value: adaptedQuestions.filter(a => a.fallback_used).length },
    { name: 'Non-Adapted', value: analytics.filter(a => !a.was_adapted).length },
  ];

  const aiHelpDistribution = [
    { name: 'AI Help Used & Accepted', value: aiHelpUsed.filter(a => a.ai_help_accepted).length },
    { name: 'AI Help Used (Not Accepted)', value: aiHelpUsed.filter(a => !a.ai_help_accepted).length },
    { name: 'No AI Help', value: analytics.filter(a => !a.ai_help_used).length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1">
            <AdminHeader breadcrumb="Adaptive Analytics" />
            <div className="container mx-auto px-6 py-8">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1">
          <AdminHeader breadcrumb="Adaptive Analytics" />
          <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Adaptive Assessment Analytics</h1>
              <p className="text-muted-foreground">
                Track adaptation success rates, AI help effectiveness, and response quality metrics
              </p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Adaptation Success Rate</CardTitle>
                  <Sparkles className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{adaptationSuccessRate.toFixed(1)}%</div>
                  <Progress value={adaptationSuccessRate} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {adaptedQuestions.filter(a => a.adaptation_success).length} / {adaptedQuestions.length} successful
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Help Acceptance</CardTitle>
                  <Brain className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{aiHelpAcceptanceRate.toFixed(1)}%</div>
                  <Progress value={aiHelpAcceptanceRate} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {aiHelpUsed.filter(a => a.ai_help_accepted).length} / {aiHelpUsed.length} accepted
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Adaptation Time</CardTitle>
                  <Zap className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(avgAdaptationTime / 1000).toFixed(2)}s</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Average time to personalize questions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Length</CardTitle>
                  <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(avgResponseLength)}</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Characters per response
                  </p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="question-wise" className="space-y-6">
              <TabsList>
                <TabsTrigger value="question-wise">By Question</TabsTrigger>
                <TabsTrigger value="adaptation">Adaptation Impact</TabsTrigger>
                <TabsTrigger value="ai-help">AI Help Impact</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
              </TabsList>

              {/* Question-wise Analysis */}
              <TabsContent value="question-wise" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Question-wise Metrics</CardTitle>
                    <CardDescription>Compare adaptation and response metrics across questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={questionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="question" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="adapted" fill={COLORS[0]} name="Adapted" />
                        <Bar dataKey="adaptationSuccess" fill={COLORS[1]} name="Success" />
                        <Bar dataKey="aiHelpUsed" fill={COLORS[2]} name="AI Help Used" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Response Quality by Question</CardTitle>
                    <CardDescription>Average response length and time to complete</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={questionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="question" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="avgResponseLength" stroke={COLORS[0]} name="Avg Length (chars)" />
                        <Line yAxisId="right" type="monotone" dataKey="avgTimeToComplete" stroke={COLORS[2]} name="Avg Time (sec)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Adaptation Impact */}
              <TabsContent value="adaptation" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Adapted vs Non-Adapted Questions</CardTitle>
                    <CardDescription>Compare response quality between adapted and standard questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="avgLength" fill={COLORS[0]} name="Avg Length (chars)" />
                        <Bar yAxisId="right" dataKey="avgTime" fill={COLORS[1]} name="Avg Time (sec)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Response Length Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {comparisonData.map((item, index) => (
                        <div key={item.type} className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{item.type}</span>
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              {Math.round(item.avgLength)} chars
                            </Badge>
                          </div>
                          <Progress 
                            value={(item.avgLength / Math.max(...comparisonData.map(d => d.avgLength))) * 100} 
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on {item.count} responses
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Time to Complete Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {comparisonData.map((item, index) => (
                        <div key={item.type} className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{item.type}</span>
                            <Badge variant={index === 0 ? "default" : "secondary"}>
                              {Math.round(item.avgTime)}s
                            </Badge>
                          </div>
                          <Progress 
                            value={(item.avgTime / Math.max(...comparisonData.map(d => d.avgTime))) * 100} 
                            className="h-2"
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* AI Help Impact */}
              <TabsContent value="ai-help" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>AI Help Impact on Response Quality</CardTitle>
                    <CardDescription>Compare responses with and without AI assistance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={aiHelpComparison}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="avgLength" fill={COLORS[2]} name="Avg Length (chars)" />
                        <Bar yAxisId="right" dataKey="avgTime" fill={COLORS[3]} name="Avg Time (sec)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Help Usage Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold">
                          {totalResponses > 0 ? ((aiHelpUsed.length / totalResponses) * 100).toFixed(1) : 0}%
                        </span>
                        <Badge variant="outline">
                          {aiHelpUsed.length} / {totalResponses} responses
                        </Badge>
                      </div>
                      <Progress value={totalResponses > 0 ? (aiHelpUsed.length / totalResponses) * 100 : 0} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Quality Improvement</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Response Length</span>
                          {aiHelpComparison[0].avgLength > aiHelpComparison[1].avgLength ? (
                            <Badge variant="default" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{Math.round(((aiHelpComparison[0].avgLength - aiHelpComparison[1].avgLength) / aiHelpComparison[1].avgLength) * 100)}%
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {Math.round(((aiHelpComparison[0].avgLength - aiHelpComparison[1].avgLength) / aiHelpComparison[1].avgLength) * 100)}%
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Comparing AI-assisted vs manual responses
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Distribution */}
              <TabsContent value="distribution" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Adaptation Distribution</CardTitle>
                      <CardDescription>Breakdown of adaptation outcomes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={adaptationDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {adaptationDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>AI Help Distribution</CardTitle>
                      <CardDescription>Breakdown of AI assistance usage</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={aiHelpDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {aiHelpDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Summary Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
                        <p className="text-2xl font-bold">{totalResponses}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Avg Time to Complete</p>
                        <p className="text-2xl font-bold">{Math.round(avgTimeToComplete)}s</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                        <p className="text-2xl font-bold">
                          {totalResponses > 0 ? ((analytics.filter(a => a.response_completed).length / totalResponses) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAdaptiveAnalytics;
