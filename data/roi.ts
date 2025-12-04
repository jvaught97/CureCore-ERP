// ROI calculation coefficients and defaults

export const roiDefaults = {
  opsTeamSize: 3,
  salesTeamSize: 2,
  financeTeamSize: 1,
  batchesPerMonth: 20,
  quotesPerMonth: 15,
  manualHoursPerWeek: 35,
  errorRatePct: 5,
  avgHourlyRate: 35,
};

export const timeSavingMultipliers = {
  // Per team member per week
  operations: {
    inventory: 3, // hours saved per ops person per week
    batching: 4,
    formulations: 2.5,
    packaging: 2,
    compliance: 3.5,
  },
  commercial: {
    crm: 2.5,
    quoting: 3,
    salesOrders: 1.5,
    distribution: 2,
  },
  financial: {
    pnl: 2,
    budgeting: 1.5,
    arAp: 3,
    bankRec: 2.5,
    payroll: 1.5,
    tax: 1,
  },
};

export const errorReductionValue = {
  // Cost per error prevented (material waste, rework, customer returns)
  manufacturing: 450,
  quoting: 1200,
  finance: 800,
};

export const calculateROI = (inputs: {
  opsTeamSize: number;
  salesTeamSize: number;
  financeTeamSize: number;
  batchesPerMonth: number;
  quotesPerMonth: number;
  manualHoursPerWeek: number;
  errorRatePct: number;
  planPrice: number;
}) => {
  const hourlyRate = roiDefaults.avgHourlyRate;

  // Calculate time savings
  const opsTimeSaved = inputs.opsTeamSize * (
    timeSavingMultipliers.operations.inventory +
    timeSavingMultipliers.operations.batching +
    timeSavingMultipliers.operations.formulations +
    timeSavingMultipliers.operations.packaging +
    timeSavingMultipliers.operations.compliance
  );

  const salesTimeSaved = inputs.salesTeamSize * (
    timeSavingMultipliers.commercial.crm +
    timeSavingMultipliers.commercial.quoting +
    timeSavingMultipliers.commercial.salesOrders +
    timeSavingMultipliers.commercial.distribution
  );

  const financeTimeSaved = inputs.financeTeamSize * (
    timeSavingMultipliers.financial.pnl +
    timeSavingMultipliers.financial.budgeting +
    timeSavingMultipliers.financial.arAp +
    timeSavingMultipliers.financial.bankRec +
    timeSavingMultipliers.financial.payroll +
    timeSavingMultipliers.financial.tax
  );

  const totalWeeklyHoursSaved = opsTimeSaved + salesTimeSaved + financeTimeSaved;
  const totalAnnualHoursSaved = totalWeeklyHoursSaved * 52;

  // Calculate labor cost savings
  const laborSavingsAnnual = totalAnnualHoursSaved * hourlyRate;

  // Calculate error reduction savings
  const currentMonthlyErrors = (inputs.batchesPerMonth + inputs.quotesPerMonth) * (inputs.errorRatePct / 100);
  const errorReductionPct = 0.85; // 85% error reduction with SMOS
  const errorsPreventedMonthly = currentMonthlyErrors * errorReductionPct;
  const avgCostPerError = (errorReductionValue.manufacturing + errorReductionValue.quoting) / 2;
  const errorSavingsAnnual = errorsPreventedMonthly * 12 * avgCostPerError;

  // Total savings
  const totalAnnualSavings = laborSavingsAnnual + errorSavingsAnnual;
  const annualCost = inputs.planPrice * 12;
  const netAnnualBenefit = totalAnnualSavings - annualCost;
  const roi = ((totalAnnualSavings - annualCost) / annualCost) * 100;
  const paybackMonths = annualCost / (totalAnnualSavings / 12);
  const threeYearValue = (totalAnnualSavings * 3) - (annualCost * 3);

  return {
    weeklyHoursSaved: Math.round(totalWeeklyHoursSaved),
    annualHoursSaved: Math.round(totalAnnualHoursSaved),
    laborSavings: Math.round(laborSavingsAnnual),
    errorSavings: Math.round(errorSavingsAnnual),
    totalAnnualSavings: Math.round(totalAnnualSavings),
    annualCost: Math.round(annualCost),
    netAnnualBenefit: Math.round(netAnnualBenefit),
    roi: Math.round(roi),
    paybackMonths: parseFloat(paybackMonths.toFixed(1)),
    threeYearValue: Math.round(threeYearValue),
  };
};
