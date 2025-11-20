import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  BarChart3,
  Zap
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface AdaptationMetrics {
  totalAdaptations: number;
  successfulAdaptations: number;
  failedAdaptations: number;
  averageAdaptationTime: number;
  fallbackUsageCount: number;
  questionBreakdown: Record<number, {
    total: number;
    successful: number;
    failed: number;
    avgTime: number;
  }>;
}

interface AIHelpMetrics {
  totalUsage: number;
  acceptanceRate: number;
  questionBreakdown: Record<number, {
    used: number;
    accepted: number;
    acceptanceRate: number;
  }>;
}

export const AdaptiveAnalyticsEnhanced = () => {
  const [adaptationMetrics, setAdaptationMetrics] = useState<AdaptationMetrics | null>(null);
  const [aiHelpMetrics, setAIHelpMetrics] = useState<AIHelpMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // Fetch adaptation analytics
      const { data: adaptationData, error: adaptationError } = await supabase
        .from('adaptation_analytics')
        .select('*');

      if (adaptationError) throw adaptationError;

      // Process adaptation metrics
      const adaptMetrics: AdaptationMetrics = {
        totalAdaptations: adaptationData?.length || 0,
        successfulAdaptations: adaptationData?.filter(a => a.adaptation_success).length || 0,
        failedAdaptations: adaptationData?.filter(a => !a.adaptation_success).length || 0,
        averageAdaptationTime: adaptationData?.length 
          ? adaptationData.reduce((sum, a) => sum + (a.adaptation_time_ms || 0), 0) / adaptationData.length 
          : 0,
        fallbackUsageCount: adaptationData?.filter(a => a.fallback_used).length || 0,
        questionBreakdown: {}
      };

      // Build question breakdown
      [2, 3, 4, 5].forEach(qNum => {
        const qData = adaptationData?.filter(a => a.question_number === qNum) || [];
        adaptMetrics.questionBreakdown[qNum] = {
          total: qData.length,
          successful: qData.filter(a => a.adaptation_success).length,
          failed: qData.filter(a => !a.adaptation_success).length,
          avgTime: qData.length 
            ? qData.reduce((sum, a) => sum + (a.adaptation_time_ms || 0), 0) / qData.length 
            : 0
        };
      });

      setAdaptationMetrics(adaptMetrics);

      // Process AI Help metrics
      const aiHelpData = adaptationData?.filter(a => a.ai_help_used) || [];
      const aiMetrics: AIHelpMetrics = {
        totalUsage: aiHelpData.length,
        acceptanceRate: aiHelpData.length 
          ? (aiHelpData.filter(a => a.ai_help_accepted).length / aiHelpData.length) * 100 
          : 0,
        questionBreakdown: {}
      };

      [2, 3, 4, 5].forEach(qNum => {
        const qAIData = aiHelpData.filter(a => a.question_number === qNum);
        aiMetrics.questionBreakdown[qNum] = {
          used: qAIData.length,
          accepted: qAIData.filter(a => a.ai_help_accepted).length,
          acceptanceRate: qAIData.length 
            ? (qAIData.filter(a => a.ai_help_accepted).length / qAIData.length) * 100 
            : 0
        };
      });

      setAIHelpMetrics(aiMetrics);

    } catch (error) {
      console.error('Error fetching enhanced analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = adaptationMetrics 
    ? (adaptationMetrics.successfulAdaptations / adaptationMetrics.totalAdaptations) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Adaptations</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adaptationMetrics?.totalAdaptations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Questions personalized for candidates
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate.toFixed(1)}%</div>
            <Progress value={successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Adaptation Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((adaptationMetrics?.averageAdaptationTime || 0) / 1000).toFixed(2)}s
            </div>
            <p className="text-xs text-muted-foreground">
              Time to personalize questions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Help Usage</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{aiHelpMetrics?.totalUsage || 0}</div>
            <p className="text-xs text-muted-foreground">
              {aiHelpMetrics?.acceptanceRate.toFixed(1)}% acceptance rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="adaptation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="adaptation">Adaptation Metrics</TabsTrigger>
          <TabsTrigger value="aihelp">AI Help Metrics</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="adaptation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Question-by-Question Breakdown</CardTitle>
              <CardDescription>
                Adaptation success rates and performance for each question
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[2, 3, 4, 5].map(qNum => {
                  const qData = adaptationMetrics?.questionBreakdown[qNum];
                  if (!qData || qData.total === 0) return null;

                  const qSuccessRate = (qData.successful / qData.total) * 100;

                  return (
                    <div key={qNum} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Q{qNum}</Badge>
                          <span className="text-sm font-medium">
                            {qNum === 2 && 'Initiative Design'}
                            {qNum === 3 && 'Saturday Crisis'}
                            {qNum === 4 && '2026 Goal'}
                            {qNum === 5 && 'Leadership Style'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {qData.total} adaptations
                          </span>
                          <Badge variant={qSuccessRate >= 90 ? 'default' : qSuccessRate >= 70 ? 'secondary' : 'destructive'}>
                            {qSuccessRate.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={qSuccessRate} />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {qData.successful} successful
                        </span>
                        <span className="flex items-center gap-1">
                          <XCircle className="h-3 w-3 text-red-500" />
                          {qData.failed} failed
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(qData.avgTime / 1000).toFixed(2)}s avg
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fallback Usage</CardTitle>
              <CardDescription>
                When AI adaptation failed and fallback questions were used
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{adaptationMetrics?.fallbackUsageCount || 0}</div>
                  <p className="text-sm text-muted-foreground">times fallback used</p>
                </div>
                <AlertCircle className="h-8 w-8 text-yellow-500" />
              </div>
              {adaptationMetrics && adaptationMetrics.totalAdaptations > 0 && (
                <div className="mt-4">
                  <Progress 
                    value={(adaptationMetrics.fallbackUsageCount / adaptationMetrics.totalAdaptations) * 100} 
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {((adaptationMetrics.fallbackUsageCount / adaptationMetrics.totalAdaptations) * 100).toFixed(1)}% 
                    of adaptations used fallback
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aihelp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Help Effectiveness</CardTitle>
              <CardDescription>
                How often candidates use and accept AI-generated suggestions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[2, 3, 4, 5].map(qNum => {
                  const qData = aiHelpMetrics?.questionBreakdown[qNum];
                  if (!qData || qData.used === 0) return null;

                  return (
                    <div key={qNum} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Q{qNum}</Badge>
                          <span className="text-sm font-medium">
                            {qNum === 2 && 'Initiative Design'}
                            {qNum === 3 && 'Saturday Crisis'}
                            {qNum === 4 && '2026 Goal'}
                            {qNum === 5 && 'Leadership Style'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            {qData.used} uses
                          </span>
                          <Badge variant={qData.acceptanceRate >= 50 ? 'default' : 'secondary'}>
                            {qData.acceptanceRate.toFixed(1)}% accepted
                          </Badge>
                        </div>
                      </div>
                      <Progress value={qData.acceptanceRate} />
                      <div className="text-xs text-muted-foreground">
                        {qData.accepted} of {qData.used} suggestions were incorporated
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overall AI Help Impact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">{aiHelpMetrics?.totalUsage || 0}</div>
                  <p className="text-sm text-muted-foreground">Total AI Help requests</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{aiHelpMetrics?.acceptanceRate.toFixed(1)}%</div>
                  <p className="text-sm text-muted-foreground">Acceptance rate</p>
                </div>
              </div>
              <Progress value={aiHelpMetrics?.acceptanceRate || 0} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>
                Key metrics about adaptive assessment performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Fastest Adaptation</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.min(
                        ...Object.values(adaptationMetrics?.questionBreakdown || {})
                          .map(q => q.avgTime)
                          .filter(t => t > 0)
                      ) / 1000}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Slowest Adaptation</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.max(
                        ...Object.values(adaptationMetrics?.questionBreakdown || {})
                          .map(q => q.avgTime)
                      ) / 1000}s
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Most Adapted Question</span>
                    <Badge>
                      Q
                      {Object.entries(adaptationMetrics?.questionBreakdown || {})
                        .sort((a, b) => b[1].total - a[1].total)[0]?.[0] || 2}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Highest Success Rate</span>
                    <Badge variant="default">
                      Q
                      {Object.entries(adaptationMetrics?.questionBreakdown || {})
                        .map(([q, data]) => ({ 
                          q, 
                          rate: data.total > 0 ? (data.successful / data.total) * 100 : 0 
                        }))
                        .sort((a, b) => b.rate - a.rate)[0]?.q || 2}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Quality Indicators</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Successful adaptations</span>
                    <span className="font-medium text-green-500">
                      {adaptationMetrics?.successfulAdaptations || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Failed adaptations</span>
                    <span className="font-medium text-red-500">
                      {adaptationMetrics?.failedAdaptations || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Fallback usage</span>
                    <span className="font-medium text-yellow-500">
                      {adaptationMetrics?.fallbackUsageCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
