
import React, { useState, useMemo, useEffect } from 'react';
import { PRODUCTS } from './constants';
import { MoqLevel, CalculationResult } from './types';
import PricingChart from './components/PricingChart';

// Reusable Info Tooltip Component
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <div className="group relative inline-block ml-2 align-middle">
    <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-bold text-white/40 group-hover:border-emerald-500 group-hover:text-emerald-500 transition-colors cursor-help">
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
  const [isQ4, setIsQ4] = useState(false);
  
  const [feesActive, setFeesActive] = useState({
    labelling: false,
    prep: false,
    inbound: true,
    storage: true
  });
  
  const [feeAmounts, setFeeAmounts] = useState({
    labelling: 0.20,
    prep: 0.50,
    inbound: 0.30,
    storageStandard: 0.10,
    storagePeak: 0.25
  });

  const [adControlMode, setAdControlMode] = useState<'BUDGET' | 'ROAS'>('BUDGET');
  const [manualDailyBudget, setManualDailyBudget] = useState<number | null>(150);
  const [targetRoas, setTargetRoas] = useState<number | null>(4.0);
  
  const [customUnitCost, setCustomUnitCost] = useState<number | null>(null);
  const [customSrp, setCustomSrp] = useState<number | null>(null);
  const [showTax, setShowTax] = useState(true);

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
    const referralFee = sellingPriceExVat * product.referralFeePercent;
    const fulfillmentFee = product.fbaFee;

    let storageFee = 0;
    if (feesActive.storage) {
      const rate = isQ4 ? feeAmounts.storagePeak : feeAmounts.storageStandard;
      storageFee = rate * (turnoverDays / 30);
    }
    
    const returnsFee = 0.18;
    const extraFees = (feesActive.labelling ? feeAmounts.labelling : 0) + 
                     (feesActive.prep ? feeAmounts.prep : 0) + 
                     (feesActive.inbound ? feeAmounts.inbound : 0);

    let agedInventoryFee = 0;
    if (turnoverDays > 365) agedInventoryFee = 2.50;
    else if (turnoverDays > 271) agedInventoryFee = 1.25;
    else if (turnoverDays > 181) agedInventoryFee = 0.50;

    const baseFees = referralFee + fulfillmentFee + storageFee + extraFees + returnsFee + agedInventoryFee; 
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

    const safeNum = (n: number) => isFinite(n) ? n : 0;

    return {
      unitCost: safeNum(unitCost),
      sellingPriceExVat: safeNum(sellingPriceExVat),
      vatAmount: safeNum(vatAmount),
      referralFee: safeNum(referralFee),
      fulfillmentFee: safeNum(fulfillmentFee),
      storageFee: safeNum(storageFee),
      inboundFee: safeNum(feesActive.inbound ? feeAmounts.inbound : 0),
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
  }, [product, selectedMoqLevel, customUnitCost, retailPrice, sellingPriceExVat, turnoverDays, adControlMode, manualDailyBudget, targetRoas, estimatedDailySales, landingCostPerUnit, feesActive, feeAmounts, isQ4]);

  const isProfitable = calculation.netProfitPerUnit > 0;
  const accentColorClass = isProfitable ? 'text-emerald-500' : 'text-brandRed';
  const accentBgClass = isProfitable ? 'bg-emerald-500' : 'bg-brandRed';
  const accentBorderClass = isProfitable ? 'border-emerald-500/30' : 'border-brandRed/30';
  const accentShadowClass = isProfitable ? 'shadow-emerald-500/20' : 'shadow-brandRed/20';

  const exportToCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Product Name', product.name],
      ['MOQ Level', selectedMoqLevel],
      ['Units Per Day', estimatedDailySales],
      ['Retail Price (Inc VAT)', `£${retailPrice.toFixed(2)}`],
      ['Unit Cost (Landing + COGS)', `£${(calculation.unitCost + calculation.landingCost).toFixed(2)}`],
      ['FBA Referral Fee', `£${calculation.referralFee.toFixed(2)}`],
      ['FBA Fulfilment Fee', `£${calculation.fulfillmentFee.toFixed(2)}`],
      ['Monthly Storage Fee', `£${calculation.monthlyStorageFee.toFixed(2)}`],
      ['Marketing Per Unit', `£${calculation.adSpendPerUnit.toFixed(2)}`],
      ['Net Profit Per Unit', `£${calculation.netProfitPerUnit.toFixed(2)}`],
      ['Profit Margin', `${calculation.marginPercent.toFixed(2)}%`],
      ['Unit ROI', `${calculation.roiPercent.toFixed(2)}%`],
      ['', ''],
      ['Financial Outlook', ''],
      ['Daily Net Profit', `£${calculation.dailyNetProfit.toFixed(2)}`],
      ['Weekly Net Profit', `£${calculation.weeklyNetProfit.toFixed(2)}`],
      ['Monthly Net Profit', `£${calculation.monthlyNetProfit.toFixed(2)}`],
      ['Yearly Net Profit', `£${calculation.yearlyNetProfit.toFixed(2)}`],
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `REVIV_FBA_${product.name.replace(/\s/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            {error && <p className="text-[9px] font-bold text-brandRed text-center tracking-widest animate-pulse uppercase">{error}</p>}
            <button 
              type="submit"
              disabled={!password}
              className={`w-full ${!password ? 'bg-brandGray/20 opacity-50 cursor-not-allowed' : 'bg-brandRed shadow-lg shadow-brandRed/20 hover:bg-brandRed/90 hover:scale-[1.02] active:scale-[0.98]'} text-white py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all`}
            >
              Authorize Access
            </button>
          </form>
          <footer className="mt-8 text-center opacity-20"><p className="text-[7px] font-bold text-brandGray uppercase tracking-[0.5em]">Classified Infrastructure // Reviv Dynamics</p></footer>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-montserrat selection:bg-brandRed/30 pb-20 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className={`absolute top-[-10%] right-[-5%] w-[50%] h-[50%] ${accentBgClass} rounded-full blur-[180px] transition-colors duration-1000`}></div>
        <div className={`absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] ${accentBgClass} rounded-full blur-[150px] opacity-20 transition-colors duration-1000`}></div>
      </div>

      <header className="relative z-50 border-b border-white/5 backdrop-blur-2xl bg-black/60 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-brandRed tracking-[0.3em] uppercase">Profit Matrix</h1>
            <p className="text-[9px] font-bold text-brandGray tracking-[0.2em] uppercase mt-1">Internal Strategic Pricing Engine</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={exportToCsv}
              className={`px-6 py-2 rounded-full border border-emerald-500/40 text-emerald-500 text-[9px] font-bold uppercase hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
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
            <button onClick={handleLogout} className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-brandRed/20 hover:border-brandRed/40 transition-all group" title="Sign Out">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brandGray group-hover:text-brandRed" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-md overflow-hidden relative">
          <div className={`absolute top-0 right-0 w-32 h-32 ${accentBgClass} opacity-10 blur-[80px] transition-colors duration-1000`}></div>
          <PricingChart data={calculation} />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProjectionCard 
            title="Daily" 
            revenue={calculation.dailyRevenue} 
            profit={showTax ? calculation.dailyNetProfit * 0.75 : calculation.dailyNetProfit} 
            isPostTax={showTax} 
            accentColor={isProfitable ? 'emerald' : 'brandRed'}
            info="Estimated 24-hour cycle performance."
          />
          <ProjectionCard 
            title="Weekly" 
            revenue={calculation.weeklyRevenue} 
            profit={showTax ? calculation.weeklyNetProfit * 0.75 : calculation.weeklyNetProfit} 
            isPostTax={showTax} 
            highlight 
            accentColor={isProfitable ? 'emerald' : 'brandRed'}
            info="Expected weekly cash flow and profit generation."
          />
          <ProjectionCard 
            title="Monthly" 
            revenue={calculation.monthlyRevenue} 
            profit={showTax ? calculation.monthlyNetProfit * 0.75 : calculation.monthlyNetProfit} 
            isPostTax={showTax} 
            accentColor={isProfitable ? 'emerald' : 'brandRed'}
            info="Projected 30-day performance. Key for long-term ROI."
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-xl backdrop-blur-md h-full flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <h3 className="text-[10px] font-bold uppercase text-brandRed tracking-widest flex items-center gap-2">
                  <div className="w-1 h-3 bg-brandRed"></div>
                  Primary Economics
                  <InfoTooltip text="Core variables affecting manufacturing and sales velocity." />
                </h3>
                <div className="flex flex-col items-end">
                  <span className="text-[8px] font-bold text-brandGray uppercase tracking-widest mb-1">Units / Day</span>
                  <div className="w-20">
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
              
              <div className="space-y-8 flex-grow">
                <SliderInput 
                  label="Inventory Turnover" 
                  value={turnoverDays} 
                  min={1} max={365} 
                  suffix=" Days" 
                  onChange={setTurnoverDays} 
                  accentColor={isProfitable ? 'emerald' : 'brandRed'}
                />
                
                <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                  <OverrideInput label="Factory Unit Cost" value={calculation.unitCost} onChange={setCustomUnitCost} isOverridden={customUnitCost !== null} />
                  <OverrideInput label="Landing (Ship)" value={landingCostPerUnit} onChange={setLandingCostPerUnit} isOverridden={false} />
                  <div className="col-span-2">
                    <OverrideInput label="Target Retail (Inc VAT)" value={retailPrice} onChange={setCustomSrp} isOverridden={customSrp !== null} />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-brandGray uppercase tracking-widest">Tax Projection</span>
                      <span className="text-[7px] text-white/40 uppercase font-semibold">UK Corp Tax (25%)</span>
                    </div>
                    <button onClick={() => setShowTax(!showTax)} className={`w-12 h-6 rounded-full relative transition-all ${showTax ? (isProfitable ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-brandRed shadow-lg shadow-brandRed/20') : 'bg-white/10'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showTax ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-xl">
                <h3 className="text-[10px] font-bold uppercase text-brandRed tracking-widest flex items-center gap-2 mb-8">
                  <div className="w-1 h-3 bg-brandRed"></div>
                  Amazon Extra Fees
                </h3>
                <div className="space-y-3">
                  <FeeToggle label="FNSKU Labelling" active={feesActive.labelling} amount={feeAmounts.labelling} onToggle={() => setFeesActive({...feesActive, labelling: !feesActive.labelling})} onChange={(val) => setFeeAmounts({...feeAmounts, labelling: val})} tooltip="Amazon labelling service." accentColor={isProfitable ? 'emerald' : 'brandRed'} />
                  <FeeToggle label="Prep / Packaging" active={feesActive.prep} amount={feeAmounts.prep} onToggle={() => setFeesActive({...feesActive, prep: !feesActive.prep})} onChange={(val) => setFeeAmounts({...feeAmounts, prep: val})} tooltip="Bubble wrap/polybagging." accentColor={isProfitable ? 'emerald' : 'brandRed'} />
                  <FeeToggle label="Inbound Placement" active={feesActive.inbound} amount={feeAmounts.inbound} onToggle={() => setFeesActive({...feesActive, inbound: !feesActive.inbound})} onChange={(val) => setFeeAmounts({...feeAmounts, inbound: val})} tooltip="Distribution fee." accentColor={isProfitable ? 'emerald' : 'brandRed'} />
                  
                  <div className="pt-4 border-t border-white/5 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setFeesActive({...feesActive, storage: !feesActive.storage})} className={`w-8 h-4 rounded-full relative transition-all ${feesActive.storage ? (isProfitable ? 'bg-emerald-500' : 'bg-brandRed') : 'bg-white/10'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${feesActive.storage ? 'left-4.5' : 'left-0.5'}`}></div>
                        </button>
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Storage</span>
                      </div>
                      <button onClick={() => setIsQ4(!isQ4)} className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase transition-all ${isQ4 ? (isProfitable ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-brandRed/20 text-brandRed border border-brandRed/30') : 'bg-white/5 text-brandGray border border-white/10'}`}>
                        {isQ4 ? 'Peak (Oct-Dec)' : 'Standard'}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <OverrideInput label="Jan-Sep Fee" value={feeAmounts.storageStandard} onChange={(val:any) => setFeeAmounts({...feeAmounts, storageStandard: val})} isOverridden={false} />
                      <OverrideInput label="Oct-Dec Fee" value={feeAmounts.storagePeak} onChange={(val:any) => setFeeAmounts({...feeAmounts, storagePeak: val})} isOverridden={false} />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-xl flex flex-col">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-[10px] font-bold uppercase text-brandRed tracking-widest flex items-center gap-2">
                    <div className="w-1 h-3 bg-brandRed"></div>
                    Ads Strategy
                  </h3>
                  <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                    <button onClick={() => setAdControlMode('BUDGET')} className={`px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${adControlMode === 'BUDGET' ? (isProfitable ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-brandRed text-white shadow-lg shadow-brandRed/20') : 'text-brandGray'}`}>Budget</button>
                    <button onClick={() => setAdControlMode('ROAS')} className={`px-3 py-1.5 rounded-lg text-[8px] font-bold uppercase transition-all ${adControlMode === 'ROAS' ? (isProfitable ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-brandRed text-white shadow-lg shadow-brandRed/20') : 'text-brandGray'}`}>ROAS</button>
                  </div>
                </div>
                <div className="space-y-6 flex-grow">
                  <div className="grid grid-cols-2 gap-4">
                    <OverrideInput label="Daily Budget" value={manualDailyBudget} onChange={setManualDailyBudget} isOverridden={adControlMode === 'ROAS'} suffix="£" />
                    <OverrideInput label="Target ROAS" value={targetRoas} onChange={setTargetRoas} isOverridden={adControlMode === 'BUDGET'} suffix="x" />
                  </div>
                  
                  {/* Visual Trace: Budget -> Unit Spend -> ROAS */}
                  <div className="pt-6 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[8px] font-bold text-brandGray uppercase tracking-widest">Marketing Efficiency Trace</span>
                       <span className={`text-[9px] font-bold ${accentColorClass} tracking-widest uppercase`}>{(calculation.roas || 0).toFixed(2)}x ROAS</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 items-center text-center">
                       <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[7px] text-white/30 uppercase font-bold block mb-1">Total Budget</span>
                          <span className="text-xs font-bold text-white">£{(calculation as any).effectiveDailyBudget.toFixed(0)}</span>
                       </div>
                       <div className="flex justify-center text-white/10">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                       </div>
                       <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-[7px] text-white/30 uppercase font-bold block mb-1">Spend / Unit</span>
                          <span className={`text-xs font-bold ${accentColorClass}`}>£{(calculation.adSpendPerUnit || 0).toFixed(2)}</span>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <div className="flex justify-between text-[7px] font-bold text-white/30 uppercase tracking-widest">
                          <span>Scale efficiency buffer</span>
                          <span>Breakeven Point</span>
                       </div>
                       <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                          <div 
                            className={`absolute top-0 left-0 h-full ${accentBgClass} transition-all duration-1000 shadow-[0_0_10px] ${accentShadowClass}`} 
                            style={{ width: `${Math.min(100, (calculation.adSpendPerUnit / (calculation.maxUnitAdSpend || 1)) * 100)}%` }}
                          />
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-white/20"></div>
                       </div>
                       <p className="text-[7px] text-brandGray font-medium leading-relaxed italic opacity-60">
                         {calculation.adSpendPerUnit < calculation.maxUnitAdSpend 
                           ? `Spending £${(calculation.maxUnitAdSpend - calculation.adSpendPerUnit).toFixed(2)} under your breakeven limit.` 
                           : `Marketing spend is currently exceeding the unit profit buffer.`}
                       </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <section className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <span className="text-[9px] font-bold text-brandGray uppercase tracking-widest">FBA Fee Audit & Waterfall</span>
                <span className="text-[7px] text-white/20 uppercase tracking-widest">Per Unit Ledger</span>
              </div>
              <div className="space-y-2">
                <WaterfallRow label="Gross Retail Price" value={retailPrice} isStart />
                <WaterfallRow label="VAT (20%)" value={calculation.vatAmount} isNegative tooltip="Government collection." />
                <WaterfallRow label="Factory COGS + Landing" value={calculation.unitCost + calculation.landingCost} isNegative />
                <WaterfallRow label="Amazon Referral Fee" value={calculation.referralFee} isNegative />
                <WaterfallRow label="FBA Fulfilment (Pick/Pack)" value={calculation.fulfillmentFee} isNegative />
                <WaterfallRow label="Extra Fees (Labelling/Prep)" value={(feesActive.labelling ? feeAmounts.labelling : 0) + (feesActive.prep ? feeAmounts.prep : 0) + (feesActive.inbound ? feeAmounts.inbound : 0)} isNegative />
                <WaterfallRow label="Storage Cost" value={calculation.storageFee} isNegative />
                <WaterfallRow label="Marketing Allocation" value={calculation.adSpendPerUnit} isNegative highlight accentColor={isProfitable ? 'emerald' : 'brandRed'} />
                
                <div className="pt-6 mt-6 border-t border-white/10 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${accentColorClass}`}>Unit Net Profit</span>
                    <span className="text-[8px] text-brandGray uppercase font-medium">Post-Fulfillment</span>
                  </div>
                  <span className={`text-4xl font-bold tracking-tighter ${accentColorClass}`}>£{(calculation.netProfitPerUnit || 0).toFixed(2)}</span>
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

const FeeToggle = ({ label, active, amount, onToggle, onChange, tooltip, accentColor }: any) => {
  const colorClass = accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-brandRed';
  const textColorClass = active ? 'text-white' : 'text-brandGray';
  
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
      <div className="flex items-center gap-2">
        <button onClick={onToggle} className={`w-8 h-4 rounded-full relative transition-all ${active ? colorClass : 'bg-white/10'}`}>
          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${active ? 'left-4.5' : 'left-0.5'}`}></div>
        </button>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${textColorClass}`}>{label}</span>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="w-16">
        <OverrideInput label="" value={amount} onChange={onChange} isOverridden={false} />
      </div>
    </div>
  );
};

const ProjectionCard = ({ title, revenue, profit, isPostTax, highlight, info, accentColor }: any) => {
  const isEmerald = accentColor === 'emerald';
  const accentBorder = isEmerald ? 'border-emerald-500/30' : 'border-brandRed/30';
  const accentBg = isEmerald ? 'bg-emerald-500/10' : 'bg-brandRed/10';
  const accentText = isEmerald ? 'text-emerald-500' : 'text-brandRed';
  const pulseColor = isEmerald ? 'bg-emerald-500' : 'bg-brandRed';

  return (
    <div className={`p-8 rounded-[2rem] border transition-all relative overflow-hidden group ${highlight ? `${accentBg} ${accentBorder} shadow-2xl scale-[1.03]` : 'bg-white/[0.03] border-white/10 shadow-xl'}`}>
      {highlight && <div className={`absolute top-0 right-0 w-24 h-24 ${isEmerald ? 'bg-emerald-500/20' : 'bg-brandRed/20'} blur-[60px] pointer-events-none`}></div>}
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-[10px] font-bold uppercase text-brandGray tracking-[0.2em]">
          {title} Outlook
          <InfoTooltip text={info} />
        </h4>
        {highlight && <div className={`w-1.5 h-1.5 ${pulseColor} rounded-full animate-pulse`}></div>}
      </div>
      <div className="space-y-6">
        <div>
          <p className="text-[8px] font-bold text-white/30 uppercase mb-1 tracking-widest">Revenue</p>
          <p className="text-2xl font-bold tracking-tight">£{Math.round(revenue || 0).toLocaleString()}</p>
        </div>
        <div className="pt-4 border-t border-white/5">
          <p className={`text-[8px] font-bold uppercase mb-1 tracking-widest ${isPostTax ? accentText : 'text-white/40'}`}>{isPostTax ? 'Post-Tax Net' : 'Gross Net Profit'}</p>
          <p className={`text-4xl font-bold tracking-tighter ${highlight ? accentText : 'text-white'}`}>£{Math.round(profit || 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

const WaterfallRow = ({ label, value, isNegative, isStart, highlight, tooltip, accentColor }: any) => {
  const isEmerald = accentColor === 'emerald';
  const highlightText = isEmerald ? 'text-emerald-500' : 'text-brandRed';
  
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center ${isStart ? 'text-white' : highlight ? highlightText : isNegative ? 'text-white/40' : 'text-white/70'}`}>
        {isNegative ? '-' : ''} {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <span className={`font-bold tracking-tight ${isStart ? 'text-base text-white' : highlight ? `${highlightText} text-base` : 'text-sm text-white/80'}`}>
        £{Math.abs(value || 0).toFixed(2)}
      </span>
    </div>
  );
};

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
          {isOverridden && <span className="text-[7px] text-brandGray font-bold uppercase italic opacity-40">Fixed</span>}
        </label>
      )}
      <div className="relative">
        <input 
          type="text" 
          inputMode="decimal"
          value={displayValue} 
          onChange={handleChange}
          className={`w-full bg-black/40 border ${isOverridden ? 'border-white/20' : 'border-white/10 focus:border-emerald-500/40'} rounded-2xl px-5 py-3 text-xs font-bold focus:outline-none transition-all placeholder:opacity-20`} 
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-brandGray text-[10px] font-bold opacity-40">{suffix}</div>
      </div>
    </div>
  );
};

const SliderInput = ({ label, value, min, max, step = 1, prefix = '', suffix = '', onChange, accentColor }: any) => {
  const isEmerald = accentColor === 'emerald';
  const colorClass = isEmerald ? 'bg-emerald-500' : 'bg-brandRed';
  const textClass = isEmerald ? 'text-emerald-500' : 'text-brandRed';
  const shadowClass = isEmerald ? 'shadow-emerald-500/50' : 'shadow-brandRed/50';

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <label className="text-[9px] font-bold uppercase text-brandGray tracking-widest">{label}</label>
        <span className={`text-2xl font-bold tracking-tighter ${textClass}`}>{prefix}{(value || 0).toLocaleString()}<small className="text-[10px] ml-1 uppercase font-semibold text-brandGray opacity-60">{suffix}</small></span>
      </div>
      <div className="relative h-2 w-full bg-white/5 rounded-full overflow-hidden group">
        <input 
          type="range" 
          min={min} max={max} step={step} 
          value={value || 0} 
          onChange={(e) => onChange(Number(e.target.value))} 
          className="absolute inset-0 w-full h-full accent-transparent bg-transparent cursor-pointer appearance-none z-10" 
        />
        <div 
          className={`absolute top-0 left-0 h-full ${colorClass} shadow-[0_0_15px] ${shadowClass} transition-all pointer-events-none`} 
          style={{ width: `${(((value || 0) - min) / (max - min)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default App;
