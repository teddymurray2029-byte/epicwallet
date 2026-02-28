import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRewardsByEventType } from '@/hooks/useRewardsData';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COLORS = [
  'hsl(174, 60%, 48%)',
  'hsl(155, 45%, 48%)',
  'hsl(210, 55%, 56%)',
  'hsl(280, 40%, 54%)',
  'hsl(42, 80%, 54%)',
  'hsl(200, 50%, 50%)',
  'hsl(140, 45%, 45%)',
  'hsl(320, 45%, 50%)',
];

export function RewardsChart() {
  const { data, isLoading, error } = useRewardsByEventType();
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');
  const chartData = data || [];

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive text-center text-sm">Failed to load chart data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Rewards by Type</CardTitle>
          <div className="flex gap-1 rounded-lg bg-muted p-0.5">
            <Button
              variant={chartType === 'bar' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setChartType('bar')}
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={chartType === 'pie' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setChartType('pie')}
            >
              <PieChartIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No data yet</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="eventType" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} CARE`, 'Earned']}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    paddingAngle={2} dataKey="amount" nameKey="eventType"
                    label={({ eventType, percent }) => `${eventType.split(' ')[0]} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} CARE`, 'Earned']}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
