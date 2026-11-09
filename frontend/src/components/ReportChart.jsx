import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PRIMARY = '#1565D8';
const LIGHT = '#D6E4FA';
const ORANGE = '#F5A623';

// variant: "bar" (value per time slot), "area" (daily average trend), "donut" (coverage)
export default function ReportChart({ variant, data, centerLabel, height = 260 }) {
  if (variant === 'donut') {
    return (
      <div className="donut-wrap" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="68%"
              outerRadius="90%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              <Cell fill={PRIMARY} />
              <Cell fill={LIGHT} />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">{centerLabel}</div>
      </div>
    );
  }

  const hasData =
    variant === 'bar'
      ? data.some((item) => item.value)
      : data.some((item) => item.average !== null);

  if (!hasData) {
    return <div className="chart-empty" style={{ height }}>No readings to chart for this period.</div>;
  }

  if (variant === 'bar') {
    return (
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3E9F3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7A90' }} />
            <YAxis tick={{ fontSize: 12, fill: '#6B7A90' }} />
            <Tooltip formatter={(value) => [`${value} mg/dl`, 'Glucose']} />
            <Bar dataKey="value" fill={PRIMARY} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.35} />
              <stop offset="95%" stopColor={PRIMARY} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3E9F3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7A90' }} minTickGap={16} />
          <YAxis tick={{ fontSize: 12, fill: '#6B7A90' }} />
          <Tooltip formatter={(value) => [`${value} mg/dl`, 'Average']} />
          <Area
            type="monotone"
            dataKey="average"
            stroke={PRIMARY}
            strokeWidth={2.5}
            fill="url(#avgFill)"
            connectNulls={false}
            dot={{ r: 3, fill: ORANGE, stroke: ORANGE }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
