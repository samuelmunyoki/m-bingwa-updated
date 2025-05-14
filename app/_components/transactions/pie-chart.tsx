import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from "recharts";

const COLORS = {
  PENDING: "#F1BB18FF", // Yellow for pending
  ERRORED: "#CC0ABCFF", // Yellow for error
  CANCELLED: "#FF3030FF", // Red for cancelled
  TIMEDOUT: "#8b5cf6", // Purple for timed out
  CONFIRMED: "#22c55e", // Green for confirmed
};

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <text
        x={cx}
        y={cy}
        dy={-4}
        className="text-sm"
        textAnchor="middle"
        fill="#333"
      >
        {payload.name}
      </text>
      <text
        x={cx}
        y={cy}
        dy={20}
        textAnchor="middle"
        className="text-sm"
        fill="#999"
      >
        {`${value} (${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

interface PieChartProps {
  data: {
    name: "PENDING" | "CANCELLED" | "TIMEDOUT" | "CONFIRMED";
    value: number;
  }[];
}

export const StatusPieChart: React.FC<PieChartProps> = ({ data }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart
        margin={{ top: 42, right: 30, left: 30, bottom: 30 }}
        className="cursor-pointer"
      >
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={57}
          outerRadius={77}
          allowReorder="no"
          cursor="pointer"
          fill="#8884d8"
          dataKey="value"
          onMouseEnter={onPieEnter}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name] || "#3b82f6"}
              stroke="none"
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};
