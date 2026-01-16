
import React, { useState, useMemo, useEffect } from 'react';
import { PRODUCTS } from './constants';
import { MoqLevel } from './types';
import PricingChart from './components/PricingChart';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeView, setActiveView] = useState<'STRATEGY' | 'AUDIT'>('STRATEGY');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id);
  const [adSales, setAdSales] = useState(25);
  const [dailyAdSpend, setDailyAdSpend] = useState(150);
  
  const [customUnitCost, setCustomUnitCost] = useState<number | null>(null);
  const [customSrp, setCustomSrp] = useState<number | null>(null);

  useEffect(() => {
    if (sessionStorage.getItem('fba_auth') === 'true') setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'REVIV') {
      setIsAuthenticated(true);
      sessionStorage.setItem('fba_auth', 'true');
    } else {
      setError('Access Denied');
      setPassword('');
      setTimeout(() => setError(''), 3000);
    }
  };

  const product = useMemo(() => 
    PRODUCTS.find(p => p.id === selectedProductId) || PRODUCTS[0]
  , [selectedProductId]);

  const retailPrice = Math.max(0, customSrp ?? product.suggestedRetailPrice);
  const sellingPriceExVat = retailPrice / 1.2;

  const calculation = useMemo(() => {
    const unitCost = Math.max(0, customUnitCost ?? product.pricing[MoqLevel.MED].unitCost);
    const incVatPrice = retailPrice;
    const vatAmount = incVatPrice - sellingPriceExVat;

    const referralFee = incVatPrice * product.referralFeePercent;
    const fulfillmentFee = product.fbaFee;
    const digitalServicesFee = incVatPrice * 0.006; // 0.6% as per CSV
    const storageFee = 0.15; // Estimated storage per unit
    
    // Total Amazon fees excluding VAT
    const totalFeesExVat = referralFee + fulfillmentFee + digitalServicesFee + storageFee;
    
    // VAT on Amazon Fees (20%) - Treated as non-reclaimable cost for conservative planning
    const vatOnAmazonFees = totalFeesExVat * 0.20;
    
    // Total fixed costs per unit (Unit Cost + Amazon Fees + VAT on Fees + Product VAT)
    const totalUnitFixedCosts = unitCost + totalFeesExVat + vatOnAmazonFees + vatAmount;
    
    // Profit before Ads
    const preAdUnitProfit = incVatPrice - totalUnitFixedCosts;

    // Advertising metrics
    const adSpendPerUnit = adSales > 0 ? dailyAdSpend / adSales : 0;
    const roas = adSales > 0 ? (adSales * sellingPriceExVat) / dailyAdSpend : 0;
    const breakevenAdSpendPerUnit = Math.max(0, preAdUnitProfit);
    
    // Final Net Yield after all deductions
    const netProfitPerUnit = preAdUnitProfit - adSpendPerUnit;
    const dailyRevenue = incVatPrice * adSales;
    const dailyNetProfit = netProfitPerUnit * adSales;
    const dailyFees = (totalFeesExVat + vatOnAmazonFees + vatAmount) * adSales;

    const safeNum = (n: number) => isFinite(n) ? n : 0;

    return {
      unitCost: safeNum(unitCost),
      sellingPriceExVat: safeNum(sellingPriceExVat),
      vatAmount: safeNum(vatAmount),
      referralFee: safeNum(referralFee),
      fulfillmentFee: safeNum(fulfillmentFee),
      storageFee: safeNum(storageFee),
      digitalServicesFee: safeNum(digitalServicesFee),
      adSpendPerUnit: safeNum(adSpendPerUnit),
      netProfitPerUnit: safeNum(netProfitPerUnit),
      dailyRevenue: safeNum(dailyRevenue),
      dailyNetProfit: safeNum(dailyNetProfit),
      dailyFees: safeNum(dailyFees),
      totalSales: adSales,
      marginPercent: incVatPrice > 0 ? safeNum((netProfitPerUnit / incVatPrice) * 100) : 0,
      roas: safeNum(roas),
      breakevenAdSpendPerUnit: safeNum(breakevenAdSpendPerUnit)
    };
  }, [product, customUnitCost, retailPrice, sellingPriceExVat, adSales, dailyAdSpend]);

  const isProfitable = calculation.dailyNetProfit > 0;
  const profitColorClass = isProfitable ? 'text-brandGreen' : 'text-brandRed';

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brandWhite flex items-center justify-center p-6">
        <div className="w-full max-w-sm border-t-4 border-brandRed pt-10">
          <div className="flex justify-center mb-8">
            <h1 className="text-4xl font-brand-header tracking-tighter">10<span className="text-brandRed">X</span> HEALTH</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="font-brand-sub text-[10px] tracking-widest text-brandGray mb-2 block">Brand Access Key</label>
              <input 
                type="password" autoFocus placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-brandBlack py-3 text-sm font-brand-body focus:outline-none focus:border-brandRed transition-colors"
              />
            </div>
            {error && <p className="text-[10px] text-brandRed font-brand-header tracking-widest text-center">{error}</p>}
            <button className="w-full bg-brandBlack text-white py-4 font-brand-header text-[11px] tracking-[0.2em] hover:bg-brandRed transition-colors">Authorize Session</button>
          </form>
          <div className="mt-12 pulse-line"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-brandWhite font-brand-body">
      {/* BRANDED SIDEBAR */}
      <aside className="w-20 bg-brandBlack flex flex-col items-center py-10 sticky top-0 h-screen shrink-0 border-r border-brandGray/10">
        <div className="mb-12">
          <div className="text-white font-brand-header text-xl flex flex-col items-center leading-none">
            <span>10</span>
            <span className="text-brandRed">X</span>
          </div>
        </div>
        <nav className="flex flex-col gap-10">
          <SidebarBtn active={activeView === 'STRATEGY'} onClick={() => setActiveView('STRATEGY')} icon={<PulseIcon />} />
          <SidebarBtn active={activeView === 'AUDIT'} onClick={() => setActiveView('AUDIT')} icon={<AnalyticsIcon />} />
        </nav>
        <button onClick={() => { sessionStorage.removeItem('fba_auth'); window.location.reload(); }} className="mt-auto text-brandGray hover:text-white transition-colors">
          <LogoutIcon />
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-8 lg:p-14 overflow-y-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6 max-w-7xl mx-auto border-b border-brandGray/10 pb-10">
          <div>
            <h1 className="text-4xl font-brand-header tracking-tighter leading-none">ROI <span className="text-brandRed">SYSTEM</span></h1>
            <p className="font-brand-sub text-[11px] text-brandGray tracking-[0.3em] mt-3">Precision Wellness Financial Engine</p>
          </div>
          <div className="flex items-center gap-4">
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="bg-brandWhite font-brand-sub text-[11px] tracking-widest px-6 py-3 border border-brandBlack outline-none cursor-pointer">
              {PRODUCTS.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
            </select>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {activeView === 'STRATEGY' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              
              {/* LEFT COLUMN: PRECISION INPUTS */}
              <div className="lg:col-span-5 space-y-12">
                <section>
                  <h2 className="font-brand-header text-[12px] tracking-[0.2em] mb-12 flex items-center gap-4">
                    <span className="w-8 h-[2px] bg-brandRed"></span>
                    Strategy Controls
                  </h2>
                  <div className="space-y-16">
                    <BrandSlider label="Daily Ad Budget" value={dailyAdSpend} onChange={setDailyAdSpend} min={0} max={3000} prefix="£" />
                    <BrandSlider label="Sales Velocity" value={adSales} onChange={setAdSales} min={1} max={500} suffix="U" />
                    
                    <div className="grid grid-cols-2 gap-10 pt-10 border-t border-brandGray/10">
                      <BrandInput label="Factory Unit Cost" value={calculation.unitCost} onChange={setCustomUnitCost} isCustom={customUnitCost !== null} />
                      <BrandInput label="Target Retail SRP" value={retailPrice} onChange={setCustomSrp} isCustom={customSrp !== null} />
                    </div>

                    <button onClick={() => { setCustomUnitCost(null); setCustomSrp(null); setAdSales(25); setDailyAdSpend(150); }} className="font-brand-sub text-[10px] tracking-[0.3em] text-brandGray hover:text-brandBlack transition-colors">Reset To Standard Protocol</button>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: PERFORMANCE SCOREBOARD */}
              <div className="lg:col-span-7 space-y-10">
                <div className="border-l-4 border-brandBlack pl-10">
                  <span className="font-brand-sub text-[11px] tracking-[0.4em] text-brandGray block mb-4">Daily Net Yield</span>
                  <div className="flex items-baseline gap-4">
                    <h2 className={`text-7xl lg:text-8xl font-brand-header tracking-tighter ${profitColorClass}`}>
                      £{Math.abs(calculation.dailyNetProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                    {!isProfitable && <span className="font-brand-header text-brandRed text-xl">RISK</span>}
                    {isProfitable && <span className="font-brand-header text-brandGreen text-xl">PROFIT</span>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-8 py-12 border-y border-brandGray/10">
                  <ScoreItem label="Revenue" value={`£${Math.round(calculation.dailyRevenue).toLocaleString()}`} />
                  <ScoreItem label="Fees" value={`£${Math.round(calculation.dailyFees).toLocaleString()}`} />
                  <ScoreItem label="Efficiency" value={`${calculation.roas.toFixed(2)}x`} />
                </div>

                <div className="grid grid-cols-2 gap-12 pt-4">
                  <div>
                    <span className="font-brand-sub text-[10px] tracking-widest text-brandGray block mb-4">Breakeven Threshold</span>
                    <p className="text-4xl font-brand-header tracking-tighter text-brandBlack">£{calculation.breakevenAdSpendPerUnit.toFixed(2)} <span className="text-xs text-brandGray tracking-widest">CPA</span></p>
                    <div className="mt-4 h-[2px] bg-brandGray/10 w-full relative">
                      <div className="absolute top-0 left-0 h-full bg-brandRed" style={{ width: `${Math.min(100, (calculation.adSpendPerUnit / (calculation.breakevenAdSpendPerUnit || 1)) * 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <OutlookRow label="Weekly Yield" value={`£${Math.round(calculation.dailyNetProfit * 7).toLocaleString()}`} valueColor={profitColorClass} />
                    <OutlookRow label="Monthly Forecast" value={`£${Math.round(calculation.dailyNetProfit * 30).toLocaleString()}`} valueColor={profitColorClass} />
                  </div>
                </div>
                
                <div className="pt-10 pulse-line opacity-10"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-16 max-w-5xl mx-auto">
              <PricingChart data={calculation as any} isProfitable={isProfitable} />
              
              <div className="border-t border-brandBlack pt-16">
                <h3 className="font-brand-header text-[14px] tracking-[0.4em] mb-12 text-center underline decoration-brandRed decoration-2 underline-offset-8">Unit Economic Waterfall</h3>
                <div className="max-w-2xl mx-auto space-y-6">
                  <WaterfallRow label="Market Sale Price" value={retailPrice} />
                  <WaterfallRow label="Product VAT (20%)" value={calculation.vatAmount} negative />
                  <WaterfallRow label="Manufacturing COGS" value={calculation.unitCost} negative />
                  <WaterfallRow label="Amazon Base Fees" value={calculation.fulfillmentFee + calculation.referralFee} negative />
                  <WaterfallRow label="Digital Svcs (0.6%)" value={calculation.digitalServicesFee} negative />
                  <div className="py-6 border-y border-brandGray/10 my-8">
                    <WaterfallRow label="Acquisition Cost (Ad CPA)" value={calculation.adSpendPerUnit} negative color="brandRed" />
                  </div>
                  <div className="flex justify-between items-end pt-6">
                    <span className="font-brand-sub text-[12px] tracking-[0.3em] text-brandGray">Final Net Yield</span>
                    <span className={`text-6xl font-brand-header tracking-tighter ${profitColorClass}`}>£{calculation.netProfitPerUnit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- BRANDED UI COMPONENTS ---

const SidebarBtn = ({ active, onClick, icon }: any) => (
  <button onClick={onClick} className={`w-12 h-12 flex items-center justify-center transition-all ${active ? 'text-brandRed' : 'text-brandGray hover:text-white'}`}>
    {icon}
  </button>
);

const BrandSlider = ({ label, value, onChange, min, max, prefix = '', suffix = '' }: any) => (
  <div className="space-y-5">
    <div className="flex justify-between items-end">
      <label className="font-brand-sub text-[11px] tracking-[0.3em] text-brandGray">{label}</label>
      <span className="text-3xl font-brand-header tracking-tighter leading-none">{prefix}{value}{suffix}</span>
    </div>
    <input 
      type="range" min={min} max={max} value={value} 
      onChange={(e) => onChange(Number(e.target.value))} 
      className="w-full"
    />
  </div>
);

const BrandInput = ({ label, value, onChange, isCustom }: any) => (
  <div className="space-y-3">
    <label className="font-brand-sub text-[10px] tracking-[0.2em] text-brandGray">{label}</label>
    <div className="relative border-b border-brandBlack">
      <input 
        type="number" value={value || ''} 
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} 
        className={`w-full bg-transparent py-2 text-base font-bold outline-none font-brand-body ${isCustom ? 'text-brandRed' : 'text-brandBlack'}`}
      />
      <span className="absolute right-0 top-1/2 -translate-y-1/2 font-brand-header text-[10px] text-brandGray">£</span>
    </div>
  </div>
);

const ScoreItem = ({ label, value }: any) => (
  <div className="space-y-1">
    <span className="font-brand-sub text-[10px] tracking-[0.3em] text-brandGray block">{label}</span>
    <span className="text-2xl font-brand-header tracking-tighter">{value}</span>
  </div>
);

const OutlookRow = ({ label, value, valueColor }: any) => (
  <div className="flex justify-between items-center border-b border-brandGray/10 pb-2">
    <span className="font-brand-sub text-[10px] tracking-widest text-brandGray">{label}</span>
    <span className={`text-lg font-brand-header tracking-tighter ${valueColor || 'text-brandBlack'}`}>{value}</span>
  </div>
);

const WaterfallRow = ({ label, value, negative, color }: any) => (
  <div className="flex justify-between items-center">
    <span className="font-brand-sub text-[11px] tracking-[0.2em] text-brandGray">{label}</span>
    <span className={`text-xl font-brand-header tracking-tighter ${color === 'brandRed' ? 'text-brandRed' : 'text-brandBlack'}`}>
      {negative ? '-' : ''}£{Math.abs(value).toFixed(2)}
    </span>
  </div>
);

// --- BRANDED ICONS ---

const PulseIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10M18 20V4M6 20v-4" />
  </svg>
);

const LogoutIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

export default App;
