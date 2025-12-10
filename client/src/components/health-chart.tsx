import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PlayerSnapshot } from "@shared/schema";
import { format } from "date-fns";

interface HealthChartProps {
  snapshots: PlayerSnapshot[];
  title: string;
  dataKeys: {
    key: keyof PlayerSnapshot;
    name: string;
    color: string;
  }[];
  yAxisDomain?: [number, number];
}

export function HealthChart({ snapshots, title, dataKeys, yAxisDomain }: HealthChartProps) {
  const chartData = snapshots
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((snapshot) => {
      const baseData: Record<string, unknown> = {
        time: format(new Date(snapshot.createdAt), "HH:mm"),
        fullTime: format(new Date(snapshot.createdAt), "MMM d, HH:mm"),
        bloodPercent: Math.round((snapshot.blood / 5000) * 100),
        energyPercent: Math.round((snapshot.energy / 5000) * 100),
        waterPercent: Math.round((snapshot.water / 5000) * 100),
      };
      dataKeys.forEach(({ key }) => {
        if (!(key in baseData)) {
          baseData[key as string] = snapshot[key as keyof PlayerSnapshot];
        }
      });
      return baseData;
    });

  if (chartData.length === 0) {
    return (
      <Card className="overflow-visible">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64" data-testid={`chart-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={50}
                domain={yAxisDomain}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullTime;
                  }
                  return "";
                }}
              />
              <Legend />
              {dataKeys.map(({ key, name, color }) => (
                <Line
                  key={key as string}
                  type="monotone"
                  dataKey={key as string}
                  name={name}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
