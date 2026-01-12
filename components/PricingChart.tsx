
import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import { CalculationResult } from '../types';

// Reusable Info Tooltip Component for Chart
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-1 align-middle">
    <div className="w-3 h-3 rounded-full border border-white/20 flex items-center justify-center text-[7px] font-bold text-white/40 group-hover:border-brandRed group-hover:text-brandRed transition-colors cursor-help">
      i
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-black/95 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] backdrop-blur-xl">
      <p className="text-[9px] leading-relaxed text-brandGray font-medium normal-case tracking-normal">
        {text}
      </p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/95"></div>
    </div>
  </div>
);

interface PricingChartProps {
  data: CalculationResult;
}

const PricingChart: React.FC<PricingChartProps> = ({ data }) => {
  const totalRevenue = data.unitCost + data.totalFees + data.vatAmount + data.landingCost + data.netProfitPerUnit;

  const pieData = [
    { name: 'COGS', value: data.unitCost, color: '#222222' },
    { name: 'Logistics', value: data.landingCost + data.fulfillmentFee + data.storageFee, color: '#444444' },
    { name: 'Amazon Fees', value: data.referralFee, color: '#111111' },
    { name: 'Ads', value: data.adSpendPerUnit, color: '#D1242A' },
    { name: 'VAT (Tax)', value: data.vatAmount, color: '#666666' },
    { name: 'Net Profit', value: data.netProfitPerUnit, color: '#FFFFFF' },
  ].filter(d => d.value > 0.001 || d.name === 'Net Profit');

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/95 border border-white/20 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
          <p className="text-[9px] font-bold text-brandGray uppercase tracking-widest mb-1">{payload[0].name}</p>
          <p className="text-xl font-bold text-white tracking-tighter">£{payload[0].value.toFixed(2)}</p>
          <p className="text-[8px] font-bold text-brandRed uppercase mt-1 tracking-widest">
            {((payload[0].value / totalRevenue) * 100).toFixed(1)}% of Revenue
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-8">
        <div>
          <h4 className="text-[14px] font-bold text-brandRed uppercase tracking-[0.4em] mb-2 flex items-center">
            Cost Distribution Matrix
            <InfoTooltip text="A comprehensive breakdown of where every pound of revenue goes. Use this to identify cost leaks in logistics or fees." />
          </h4>
          <p className="text-[9px] text-brandGray font-medium uppercase tracking-widest">Comprehensive visual audit per unit sold</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
           <RatioValue 
            label="Net Margin" 
            value={`${data.marginPercent.toFixed(1)}%`} 
            highlight 
            info="The percentage of revenue that is actual profit after all expenses, including ads and VAT."
           />
           <RatioValue 
            label="Unit ROI" 
            value={`${data.roiPercent.toFixed(0)}%`} 
            info="Return on Investment. For every £1 you spend on manufacturing and shipping, this is how much profit you get back."
           />
           <RatioValue 
            label="Current ROAS" 
            value={`${data.roas.toFixed(1)}x`} 
            info="Return on Ad Spend. Total revenue divided by total ad spend. Higher is more efficient."
           />
           <RatioValue 
            label="TACOS" 
            value={`${data.tacos.toFixed(1)}%`} 
            info="Total Advertising Cost of Sale. Measures ad spend relative to total revenue. Targets are usually below 15%."
           />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center min-h-[350px]">
        <div className="lg:col-span-4 space-y-1 bg-white/[0.02] border border-white/5 p-6 rounded-[2rem]">
          <h5 className="text-[9px] font-bold text-brandGray uppercase tracking-[0.3em] mb-4 border-b border-white/10 pb-2">Unit Breakdown</h5>
          {pieData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]" style={{ backgroundColor: item.color }}></div>
                <span className="text-[9px] font-bold uppercase text-brandGray tracking-widest">{item.name}</span>
              </div>
              <div className="text-right">
                <div className={`text-xs font-bold ${item.name === 'Net Profit' ? 'text-brandRed' : 'text-white/90'}`}>£{item.value.toFixed(2)}</div>
                <div className="text-[7px] font-bold text-white/30 tracking-widest uppercase">{((item.value / totalRevenue) * 100).toFixed(1)}%</div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-8 h-[380px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={135}
                paddingAngle={6}
                dataKey="value"
                stroke="none"
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none w-full max-w-[160px]">
             <div className="flex flex-col items-center">
               <span className="text-[8px] font-bold text-brandGray uppercase tracking-[0.3em] mb-1">Gross Revenue</span>
               <span className="text-3xl font-bold text-white tracking-tighter leading-none mb-2">£{totalRevenue.toFixed(2)}</span>
               
               <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent my-2"></div>
               
               <span className="text-[8px] font-bold text-brandRed uppercase tracking-[0.3em] mb-1">Net Profit</span>
               <span className="text-2xl font-bold text-brandRed tracking-tighter leading-none italic">£{data.netProfitPerUnit.toFixed(2)}</span>
               <span className="text-[8px] font-bold text-brandRed/60 uppercase mt-1 tracking-widest">Per Unit</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RatioValue = ({ label, value, highlight, info }: any) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-bold text-brandGray uppercase tracking-widest mb-1 flex items-center">
      {label}
      <InfoTooltip text={info} />
    </span>
    <span className={`text-2xl font-bold tracking-tighter ${highlight ? 'text-brandRed' : 'text-white'}`}>{value}</span>
  </div>
);

export default PricingChart;
