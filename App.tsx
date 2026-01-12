
import React, { useState, useMemo, useEffect } from 'react';
import { PRODUCTS } from './constants';
import { MoqLevel, CalculationResult } from './types';
import PricingChart from './components/PricingChart';

// Reusable Info Tooltip Component
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-2 align-middle">
    <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-bold text-white/40 group-hover:border-brandRed group-hover:text-brandRed transition-colors cursor-help">
      i
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-black/95 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] backdrop-blur-xl text-left">
      <p className="text-[9px] leading-relaxed text-brandGray font-medium normal-case tracking-normal">
        {text}
      </p>
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-black/95"></div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id);
  const [selectedMoqLevel, setSelectedMoqLevel] = useState<MoqLevel>(MoqLevel.MED);
  
  const [turnoverDays, setTurnoverDays] = useState(45);
  const [landingCostPerUnit, setLandingCostPerUnit] = useState(0.85); 
  const [estimatedDailySales, setEstimatedDailySales] = useState(20);
  const [inboundPlacementFee, setInboundPlacementFee] = useState(0.40);
  const [isQ4, setIsQ4] = useState(false);
  
  // Ad Controls
  const [adControlMode, setAdControlMode] = useState<'BUDGET' | 'ROAS'>('BUDGET');
  const [manualDailyBudget, setManualDailyBudget] = useState<number | null>(150);
  const [targetRoas, setTargetRoas] = useState<number | null>(4.0);
  
  const [customUnitCost, setCustomUnitCost] = useState<number | null>(null);
  const [customSrp, setCustomSrp] = useState<number | null>(null);
  const [showTax, setShowTax] = useState(true);

  // Check session storage on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('fba_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'REVIV') {
      setIsAuthenticated(true);
      sessionStorage.setItem('fba_auth', 'true');
      setError('');
    } else {
      setIsAuthenticated(false);
      setError('ACCESS DENIED. INVALID CREDENTIALS.');
      setPassword('');
      setTimeout(() => setError(''), 4000);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('fba_auth');
    setPassword('');
  };

  const product = useMemo(() => 
    PRODUCTS.find(p => p.id === selectedProductId) || PRODUCTS[0]
  , [selectedProductId]);

  const retailPrice = Math.max(0, customSrp ?? product.suggestedRetailPrice);
  const sellingPriceExVat = retailPrice / 1.2;

  useEffect(() => {
    setCustomUnitCost(null);
    setCustomSrp(null);
  }, [selectedProductId, selectedMoqLevel]);

  const calculation = useMemo<CalculationResult>(() => {
    const unitCost = Math.max(0, customUnitCost ?? product.pricing[selectedMoqLevel].unitCost);
    const incVatPrice = retailPrice;
    const vatAmount = incVatPrice - sellingPriceExVat;

    // 1. Referral Fee
    const referralFee = sellingPriceExVat * product.referralFeePercent;

    // 2. FBA Fulfillment Fee
    const fulfillmentFee = product.fbaFee;

    // 3. Storage Fees
    const baseStorageRate = isQ4 ? 0.45 : 0.15;
    const storageFee = baseStorageRate * (turnoverDays / 30);
    
    // 4. Returns Processing
    const returnsFee = 0.18;

    // 5. Inbound Placement
    const inboundFee = inboundPlacementFee || 0;

    // 6. Aged Inventory Penalties
    let agedInventoryFee = 0;
    if (turnoverDays > 365) agedInventoryFee = 2.50;
    else if (turnoverDays > 271) agedInventoryFee = 1.25;
    else if (turnoverDays > 181) agedInventoryFee = 0.50;

    const baseFees = referralFee + fulfillmentFee + storageFee + inboundFee + returnsFee + agedInventoryFee; 
    const preAdUnitProfit = incVatPrice - (unitCost + landingCostPerUnit + baseFees + vatAmount);

    let adSpendPerUnit = 0;
    const sales = estimatedDailySales || 0;
    const budget = manualDailyBudget || 0;
    const roasTarget = targetRoas || 0;

    if (adControlMode === 'BUDGET') {
      adSpendPerUnit = sales > 0 ? budget / sales : 0;
    } else {
      adSpendPerUnit = roasTarget > 0 ? sellingPriceExVat / roasTarget : 0;
    }

    const netProfitPerUnit = preAdUnitProfit - adSpendPerUnit;
    const dailyRevenue = incVatPrice * sales;
    const dailyNetProfit = netProfitPerUnit * sales;
    const recommendedUnitAdSpend = Math.max(0, preAdUnitProfit * 0.4);
    const recommendedDailyAdSpend = recommendedUnitAdSpend * sales;

    // Safety check for NaN values to prevent UI crashes
    const safeNum = (n: number) => isFinite(n) ? n : 0;

    return {
      unitCost: safeNum(unitCost),
      sellingPriceExVat: safeNum(sellingPriceExVat),
      vatAmount: safeNum(vatAmount),
      referralFee: safeNum(referralFee),
      fulfillmentFee: safeNum(fulfillmentFee),
      storageFee: safeNum(storageFee),
      inboundFee: safeNum(inboundFee),
      agedInventoryFee: safeNum(agedInventoryFee),
      returnsFee: safeNum(returnsFee),
      adSpendPerUnit: safeNum(adSpendPerUnit),
      landingCost: safeNum(landingCostPerUnit),
      netProfitPerUnit: safeNum(netProfitPerUnit),
      netProfitAfterTax: safeNum(netProfitPerUnit * 0.75),
      marginPercent: incVatPrice > 0 ? safeNum((netProfitPerUnit / incVatPrice) * 100) : 0,
      roiPercent: (unitCost + landingCostPerUnit) > 0 ? safeNum((netProfitPerUnit / (unitCost + landingCostPerUnit)) * 100) : 0,
      totalFees: safeNum(baseFees + adSpendPerUnit),
      dailyRevenue: safeNum(dailyRevenue),
      weeklyRevenue: safeNum(dailyRevenue * 7),
      monthlyRevenue: safeNum(dailyRevenue * 30.44),
      yearlyRevenue: safeNum(dailyRevenue * 365),
      dailyNetProfit: safeNum(dailyNetProfit),
      weeklyNetProfit: safeNum(dailyNetProfit * 7),
      monthlyNetProfit: safeNum(dailyNetProfit * 30.44),
      yearlyNetProfit: safeNum(dailyNetProfit * 365),
      acos: sellingPriceExVat > 0 ? safeNum((adSpendPerUnit / sellingPriceExVat) * 100) : 0,
      tacos: dailyRevenue > 0 ? safeNum(((adSpendPerUnit * sales) / dailyRevenue) * 100) : 0,
      roas: adSpendPerUnit > 0 ? safeNum(sellingPriceExVat / adSpendPerUnit) : 0,
      capitalRequired: safeNum((unitCost + landingCostPerUnit) * sales * 90),
      recommendedDailyAdSpend: safeNum(recommendedDailyAdSpend),
      maxUnitAdSpend: safeNum(preAdUnitProfit),
      effectiveDailyBudget: safeNum(adSpendPerUnit * sales),
      monthlyStorageFee: safeNum(storageFee / (turnoverDays / 30 || 1))
    } as any;
  }, [product, selectedMoqLevel, customUnitCost, retailPrice, sellingPriceExVat, turnoverDays, adControlMode, manualDailyBudget, targetRoas, estimatedDailySales, landingCostPerUnit, inboundPlacementFee, isQ4]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-montserrat relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] bg-brandRed rounded-full blur-[200px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-brandRed rounded-full blur-[150px] opacity-30"></div>
        </div>
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-sm font-bold text-brandRed tracking-[0.4em] uppercase mb-2">Security Protocol</h1>
            <p className="text-[10px] font-bold text-brandGray tracking-[0.2em] uppercase">Enter decryption key to access internal systems</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-xl space-y-8">
            <div className="space-y-2">
              <label className="text-[9px] font-bold uppercase text-brandGray tracking-widest ml-1">Access Token</label>
              <input 
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-black/60 border ${error ? 'border-brandRed' : 'border-white/10'} rounded-2xl px-6 py-4 text-center text-lg font-bold tracking-[0.3em] focus:outline-none focus:border-brandRed/50 transition-all placeholder:text-white/10 placeholder:tracking-normal`}
              />
            </div>

            {error && (
              <p className="text-[9px] font-bold text-brandRed text-center tracking-widest animate-pulse uppercase">{error}</p>
            )}

            <button 
              type="submit"
              disabled={!password}
              className={`w-full ${!password ? 'bg-brandGray/20 opacity-50 cursor-not-allowed' : 'bg-brandRed shadow-lg shadow-brandRed/20 hover:bg-brandRed/90 hover:scale-[1.02] active:scale-[0.98]'} text-white py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all`}
            >
              Authorize Access
            </button>
          </form>

          <footer className="mt-8 text-center opacity-20">
            <p className="text-[7px] font-bold text-brandGray uppercase tracking-[0.5em]">Classified Infrastructure // Reviv Dynamics</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-montserrat selection:bg-brandRed/30 pb-20 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-brandRed rounded-full blur-[180px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-brandRed rounded-full blur-[150px] opacity-20"></div>
      </div>

      <header className="relative z-50 border-b border-white/5 backdrop-blur-2xl bg-black/60 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-brandRed tracking-[0.3em] uppercase">Profit Matrix</h1>
            <p className="text-[9px] font-bold text-brandGray tracking-[0.2em] uppercase mt-1">Internal Strategic Pricing Engine</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-white/5 p-1 rounded-full border border-white/10 shadow-inner">
              <select 
                value={selectedProductId} 
                onChange={(e) => setSelectedProductId(e.target.value)} 
                className="bg-transparent text-white px-6 py-2 font-bold text-xs rounded-full focus:outline-none cursor-pointer hover:bg-white/5 transition-colors"
              >
                {PRODUCTS.map(p => <option key={p.id} value={p.id} className="bg-black">{p.name}</option>)}
              </select>
              <div className="flex gap-1 pr-1">
                {Object.values(MoqLevel).map(level => (
                  <button 
                    key={level} 
                    onClick={() => setSelectedMoqLevel(level)} 
                    className={`px-5 py-2 rounded-full text-[9px] font-bold uppercase transition-all ${selectedMoqLevel === level ? 'bg-brandRed text-white shadow-lg shadow-brandRed/20' : 'text-brandGray hover:bg-white/5'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-brandRed/20 hover:border-brandRed/40 transition-all group"
              title="Sign Out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brandGray group-hover:text-brandRed" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-md overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brandRed/10 blur-[80px]"></div>
          <PricingChart data={calculation} />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProjectionCard 
            title="Daily" 
            revenue={calculation.dailyRevenue} 
            profit={showTax ? calculation.dailyNetProfit * 0.75 : calculation.dailyNetProfit} 
            isPostTax={showTax} 
            info="Estimated performance over a 24-hour cycle based on your current unit economics and sales velocity."
          />
          <ProjectionCard 
            title="Weekly" 
            revenue={calculation.weeklyRevenue} 
            profit={showTax ? calculation.weeklyNetProfit * 0.75 : calculation.weeklyNetProfit} 
            isPostTax={showTax} 
            highlight 
            info="Crucial for inventory planning. Shows your expected weekly cash flow and profit generation."
          />
          <ProjectionCard 
            title="Monthly" 
            revenue={calculation.monthlyRevenue} 
            profit={showTax ? calculation.monthlyNetProfit * 0.75 : calculation.monthlyNetProfit} 
            isPostTax={showTax} 
            info="The macro view. Projected 30-day performance. Use this to determine if your product meets monthly ROI targets."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-xl backdrop-blur-md">
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-[10px] font-bold uppercase text-brandRed tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-brandRed"></div>
                  Primary Economics
                  <InfoTooltip text="Core business variables. Cost per unit includes manufacturing FOB price. Turnover days affect storage and aged stock penalties." />
                </h3>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-brandGray uppercase tracking-widest mb-1">Units / Day</span>
                  <div className="w-24">
                    <OverrideInput 
                      label="" 
                      value={estimatedDailySales} 
                      onChange={(val: any) => setEstimatedDailySales(val === null ? 0 : val)} 
                      isOverridden={false}
                      suffix="U"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <SliderInput label="Inventory Turnover (Days)" value={turnoverDays} min={1} max={365} suffix=" Days" onChange={setTurnoverDays} />
                <div className="pt-6 border-t border-white/5 grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <OverrideInput label="Cost Per Unit" value={calculation.unitCost} onChange={setCustomUnitCost} isOverridden={customUnitCost !== null} />
                    <OverrideInput label="Retail (Inc VAT)" value={retailPrice} onChange={setCustomSrp} isOverridden={customSrp !== null} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <OverrideInput label="Inbound Fee" value={inboundPlacementFee} onChange={setInboundPlacementFee} isOverridden={false} />
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold uppercase text-brandGray tracking-widest mb-2">Q4 Pricing</span>
                      <button onClick={() => setIsQ4(!isQ4)} className={`w-full py-3 rounded-2xl text-[9px] font-bold uppercase border transition-all ${isQ4 ? 'bg-brandRed/20 border-brandRed text-brandRed' : 'bg-white/5 border-white/10 text-white/40'}`}>
                        {isQ4 ? 'Active (Oct-Dec)' : 'Standard'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-brandGray uppercase tracking-widest">Post-Tax Projection</span>
                      <span className="text-[7px] text-white/40 uppercase font-semibold">UK Corporation Tax (25%)</span>
                    </div>
                    <button onClick={() => setShowTax(!showTax)} className={`w-12 h-6 rounded-full relative transition-colors ${showTax ? 'bg-brandRed shadow-lg shadow-brandRed/20' : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showTax ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-bold uppercase text-brandRed tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-brandRed"></div>
                  Advertising Strategy
                  <InfoTooltip text="Drive by Budget or ROAS. ROAS is Revenue (Ex-VAT) / Ad Spend. 4.0x ROAS means £4 revenue for every £1 spent." />
                </h3>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                   <button 
                    onClick={() => setAdControlMode('BUDGET')}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${adControlMode === 'BUDGET' ? 'bg-brandRed text-white shadow-lg shadow-brandRed/20' : 'text-brandGray'}`}
                   >Budget Drive</button>
                   <button 
                    onClick={() => setAdControlMode('ROAS')}
                    className={`px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${adControlMode === 'ROAS' ? 'bg-brandRed text-white shadow-lg shadow-brandRed/20' : 'text-brandGray'}`}
                   >ROAS Drive</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <OverrideInput 
                      label="Manual Budget" 
                      value={manualDailyBudget} 
                      onChange={setManualDailyBudget} 
                      isOverridden={adControlMode === 'ROAS'}
                      suffix="£"
                    />
                    <OverrideInput 
                      label="Target ROAS" 
                      value={targetRoas} 
                      onChange={setTargetRoas} 
                      isOverridden={adControlMode === 'BUDGET'}
                      suffix="x"
                    />
                  </div>
                  {adControlMode === 'BUDGET' ? (
                    <SliderInput label="Adjust Daily Budget" value={manualDailyBudget || 0} min={0} max={2500} prefix="£" onChange={setManualDailyBudget} />
                  ) : (
                    <SliderInput label="Adjust Target ROAS" value={targetRoas || 0} min={1} max={20} step={0.1} suffix="x" onChange={setTargetRoas} />
                  )}
                </div>
                
                <div className="p-5 bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col justify-center h-full">
                  <div className="mb-4 pb-4 border-b border-white/5">
                    <span className="text-[8px] font-bold text-brandGray uppercase tracking-widest mb-1 block">Spend Result</span>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xl font-bold text-white tracking-tight">£{(calculation as any).effectiveDailyBudget.toFixed(2)}</span>
                      <span className="text-sm font-bold text-brandRed tracking-tight">{(calculation.roas || 0).toFixed(2)}x ROAS</span>
                    </div>
                  </div>
                  <span className="text-[8px] font-bold text-brandRed uppercase tracking-widest mb-2 flex items-center gap-1">
                    Recommendation
                    <InfoTooltip text="Calculated based on 40% margin allocation for scale." />
                  </span>
                  <p className="text-xl font-bold tracking-tighter">£{Math.round(calculation.recommendedDailyAdSpend || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[9px] font-bold text-brandGray uppercase tracking-widest flex items-center gap-1">
                    FBA Fee Audit & Waterfall
                    <InfoTooltip text="A comprehensive trace of your retail price minus all platform costs." />
                  </span>
                  <span className="text-[7px] text-white/20 uppercase tracking-widest">Per Unit Logic</span>
                </div>
                <div className="space-y-3">
                  <WaterfallRow label="Gross Price" value={retailPrice} isStart />
                  <WaterfallRow label="VAT (20%)" value={calculation.vatAmount} isNegative tooltip="VAT collected on behalf of the government." />
                  <WaterfallRow label="COGS + Landing" value={calculation.unitCost + calculation.landingCost} isNegative tooltip="Factory cost + shipping to local prep centre." />
                  <WaterfallRow label="Amazon Referral Fee" value={calculation.referralFee} isNegative tooltip="Amazon's commission on each sale, usually 8%–15% depending on category, calculated on the selling price (including shipping if applicable)." />
                  <WaterfallRow label="FBA Fulfillment Fee" value={calculation.fulfillmentFee} isNegative tooltip="Picking, packing, and delivery by Amazon." />
                  <WaterfallRow label="Monthly Storage" value={calculation.storageFee} isNegative tooltip="Fee for warehouse space occupied. Higher in Q4." />
                  <WaterfallRow label="Inbound + Returns" value={calculation.inboundFee + calculation.returnsFee} isNegative tooltip="Placement fees for split shipments and average return handling." />
                  {calculation.agedInventoryFee > 0 && (
                    <WaterfallRow label="Aged Stock Penalty" value={calculation.agedInventoryFee} isNegative highlight tooltip="Penalty for items stored over 180 days." />
                  )}
                  <WaterfallRow label="Marketing / Ads" value={calculation.adSpendPerUnit} isNegative highlight tooltip="The advertising cost required to generate the sale." />
                  <div className="pt-4 mt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-brandRed tracking-[0.2em]">Final Net Profit</span>
                    <span className="text-3xl font-bold text-brandRed tracking-tighter">£{(calculation.netProfitPerUnit || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="mt-16 py-12 border-t border-white/5 text-center opacity-30">
        <p className="text-[8px] font-bold text-brandGray uppercase tracking-[1em]">ProfitDynamics // Powered by Reviv Engineering</p>
      </footer>
    </div>
  );
};

const ProjectionCard = ({ title, revenue, profit, isPostTax, highlight, info }: any) => (
  <div className={`p-8 rounded-[2rem] border transition-all relative overflow-hidden group ${highlight ? 'bg-brandRed/10 border-brandRed/30 shadow-2xl scale-[1.03]' : 'bg-white/[0.03] border-white/10 shadow-xl'}`}>
    {highlight && <div className="absolute top-0 right-0 w-24 h-24 bg-brandRed/20 blur-[60px] pointer-events-none"></div>}
    <div className="flex justify-between items-center mb-6">
      <h4 className="text-[10px] font-bold uppercase text-brandGray tracking-[0.2em]">
        {title} Outlook
        <InfoTooltip text={info} />
      </h4>
      {highlight && <div className="w-1.5 h-1.5 bg-brandRed rounded-full animate-pulse"></div>}
    </div>
    <div className="space-y-6">
      <div>
        <p className="text-[8px] font-bold text-white/30 uppercase mb-1 tracking-widest">Revenue</p>
        <p className="text-2xl font-bold tracking-tight">£{Math.round(revenue || 0).toLocaleString()}</p>
      </div>
      <div className="pt-4 border-t border-white/5">
        <p className="text-[8px] font-bold text-brandRed uppercase mb-1 tracking-widest">{isPostTax ? 'Post-Tax Net' : 'Gross Net Profit'}</p>
        <p className={`text-4xl font-bold tracking-tighter ${highlight ? 'text-brandRed' : 'text-white'}`}>£{Math.round(profit || 0).toLocaleString()}</p>
      </div>
    </div>
  </div>
);

const WaterfallRow = ({ label, value, isNegative, isStart, highlight, tooltip }: any) => (
  <div className="flex justify-between items-center py-1">
    <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center ${isStart ? 'text-white' : highlight ? 'text-brandRed' : isNegative ? 'text-white/40' : 'text-white/70'}`}>
      {isNegative ? '-' : ''} {label}
      {tooltip && <InfoTooltip text={tooltip} />}
    </span>
    <span className={`font-bold tracking-tight ${isStart ? 'text-base text-white' : highlight ? 'text-brandRed text-base' : 'text-sm text-white/80'}`}>
      £{Math.abs(value || 0).toFixed(2)}
    </span>
  </div>
);

const OverrideInput = ({ label, value, onChange, isOverridden, suffix = "£" }: any) => {
  const [displayValue, setDisplayValue] = useState(value?.toString() || "");

  useEffect(() => {
    const currentStr = value === null ? "" : value.toString();
    if (displayValue !== currentStr && !isNaN(parseFloat(displayValue))) {
       setDisplayValue(currentStr);
    } else if (value !== null && displayValue === "") {
       setDisplayValue(currentStr);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setDisplayValue(newVal);
    if (newVal === "" || newVal === "-" || newVal === ".") {
      onChange(null);
      return;
    }
    const parsed = parseFloat(newVal);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div className="flex-1">
      {label && (
        <label className="flex justify-between items-center mb-2">
          <span className="text-[8px] font-bold uppercase text-brandGray tracking-widest">{label}</span>
          {isOverridden && <span className="text-[7px] text-brandGray font-bold uppercase italic opacity-40">Derived</span>}
        </label>
      )}
      <div className="relative">
        <input 
          type="text" 
          inputMode="decimal"
          value={displayValue} 
          onChange={handleChange}
          className={`w-full bg-black/40 border ${isOverridden ? 'border-white/5 opacity-50' : 'border-white/10 focus:border-brandRed/40'} rounded-2xl px-5 py-3 text-xs font-bold focus:outline-none transition-all`} 
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-brandGray text-[10px] font-bold opacity-40">{suffix}</div>
      </div>
    </div>
  );
};

const SliderInput = ({ label, value, min, max, step = 1, prefix = '', suffix = '', onChange }: any) => (
  <div>
    <div className="flex justify-between items-end mb-4">
      <label className="text-[9px] font-bold uppercase text-brandGray tracking-widest">{label}</label>
      <span className="text-2xl font-bold text-brandRed tracking-tighter">{prefix}{(value || 0).toLocaleString()}<small className="text-[10px] ml-1 uppercase font-semibold text-brandGray opacity-60">{suffix}</small></span>
    </div>
    <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden group">
      <input 
        type="range" 
        min={min} 
        max={max} 
        step={step} 
        value={value || 0} 
        onChange={(e) => onChange(Number(e.target.value))} 
        className="absolute inset-0 w-full h-full accent-brandRed bg-transparent cursor-pointer appearance-none z-10 opacity-0" 
      />
      <div 
        className="absolute top-0 left-0 h-full bg-brandRed shadow-[0_0_15px_rgba(209,36,42,0.5)] transition-all pointer-events-none" 
        style={{ width: `${(((value || 0) - min) / (max - min)) * 100}%` }}
      ></div>
    </div>
  </div>
);

export default App;
