import React from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { formatDateDMY } from '../../utils/formatDate';

interface ForecastData {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
}

interface ForecastChartProps {
  data: ForecastData[];
}

const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
  const formattedData = data.map(item => ({
    ...item,
    ds: new Date(item.ds).getTime(), // Convert date string to timestamp for charting
  }));

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Cash Flow Forecast (Next 90 Days)</h3>
        <ResponsiveContainer width="100%" height={400}>
            <AreaChart
            data={formattedData}
            margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
                dataKey="ds"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(unixTime) => formatDateDMY(new Date(unixTime))}
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ dy: 10 }}
            />
            <YAxis
                tickFormatter={(value) => new Intl.NumberFormat('en-US').format(value)}
                width={80}
            />
            <Tooltip
                labelFormatter={(unixTime) => `Date: ${formatDateDMY(new Date(unixTime))}`}
                formatter={(value?: number, name?: string) => {
                    if (value === undefined) return ['', name];
                    const formattedValue = new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'RWF', // You might want to make this dynamic
                        minimumFractionDigits: 0,
                    }).format(value);

                    if (name === 'yhat') return [formattedValue, 'Predicted Cash Flow'];
                    if (name === 'Confidence Interval') return [formattedValue, 'Confidence Interval'];
                    return [formattedValue, name || ''];
                }}
            />
            <Legend />
            <Area
                type="monotone"
                dataKey="yhat"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.3}
                name="Predicted Cash Flow"
            />
            <Area
                type="monotone"
                dataKey="yhat_upper"
                stroke="#82ca9d"
                fill="#82ca9d"
                fillOpacity={0.2}
                name="Upper Confidence"
                />
            <Area
                type="monotone"
                dataKey="yhat_lower"
                stroke="#ffc658"
                fill="#ffc658"
                fillOpacity={0.2}
                name="Lower Confidence"
                />
            </AreaChart>
        </ResponsiveContainer>
    </div>
  );
};

export default ForecastChart;
