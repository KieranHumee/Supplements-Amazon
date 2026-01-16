
import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { CalculationResult } from '../types';

interface PricingChartProps { 
  data: CalculationResult; 
  isProfitable?: boolean;
}

const PricingChart: React.FC<PricingChartProps> = ({ data, isProfitable = false }) => {
  const accentColor = isProfitable ? '#00D18F' : '#D1242A';

  const pieData = [
    { name: 'Unit COGS', value: Math.max(0, data.unitCost || 0), color: '#000000' },
    { name: 'Amazon Fees', value: Math.max(0, (data.referralFee || 0) + (data.fulfillmentFee || 0)), color: '#333333' },
    { name: 'Ad Spend', value: Math.max(0, data.adSpendPerUnit || 0), color: '#818285' },
    { name: 'VAT/Tax', value: Math.max(0, data.vatAmount || 0), color: '#CCCCCC' },
    { name: 'Net Profit', value: Math.max(0, data.netProfitPerUnit || 0), color: accentColor },
  ].filter(d => d.value > 0.01);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-brandBlack text-white p-4 shadow-heavy border-t-2 border-brandRed">
          <p className="font-brand-sub text-[9px] tracking-[0.2em] mb-1">{payload[0].name}</p>
          <p className="text-2xl font-brand-header tracking-tighter">£{payload[0].value.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between items-end mb-16">
        <div>
          <h4 className="text-3xl font-brand-header tracking-tighter mb-2 underline decoration-brandRed decoration-4 underline-offset-4">Yield Matrix</h4>
          <p className="font-brand-sub text-[11px] text-brandGray tracking-[0.3em]">Economic breakdown per precision unit</p>
        </div>
        <div className="text-right">
           <span className="font-brand-sub text-[11px] text-brandGray tracking-widest block mb-2">Efficiency Rating</span>
           <span className={`text-6xl font-brand-header tracking-tighter ${isProfitable ? 'text-brandGreen' : 'text-brandBlack'}`}>{(data.marginPercent || 0).toFixed(1)}%</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-4 space-y-3">
          {pieData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 border-b border-brandGray/10 hover:border-brandRed transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-none" style={{ backgroundColor: item.color }}></div>
                <span className="font-brand-sub text-[10px] text-brandGray tracking-widest">{item.name}</span>
              </div>
              <span className="text-xl font-brand-header tracking-tighter">£{item.value.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 h-[450px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={120} outerRadius={160} paddingAngle={2} dataKey="value" stroke="none">
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
             <span className="font-brand-sub text-[10px] text-brandGray tracking-[0.4em] block mb-2">Net Value</span>
             <span className="text-6xl font-brand-header tracking-tighter block leading-none">£{data.sellingPriceExVat.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingChart;
