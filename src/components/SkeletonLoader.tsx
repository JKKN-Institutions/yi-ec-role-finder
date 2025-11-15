import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const TableSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex gap-4 items-center p-4 border rounded-lg">
        <div className="skeleton h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
        </div>
        <div className="skeleton h-8 w-20" />
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="skeleton h-6 w-1/2 mb-2" />
      <div className="skeleton h-4 w-3/4" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="skeleton h-40 w-full" />
      <div className="space-y-2">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-4/6" />
      </div>
    </CardContent>
  </Card>
);

export const ChartSkeleton = () => (
  <div className="space-y-4">
    <div className="skeleton h-6 w-1/3" />
    <div className="skeleton h-64 w-full rounded-lg" />
  </div>
);
