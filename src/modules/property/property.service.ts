import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create.property.dto';
import { SaveBrrrPropertyDataDto } from './dto/save.brrrr.property.data.dto';
import { SaveSection8PropertyDataDto } from './dto/save.section8.property.dto';
import { CalculateBrrrPropertyDto } from './dto/calculate.brrrr.property.dto';
import { CalculateTurnkeyPropertyDto } from './dto/calculate.turnkey.property.dto';

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  // async calculateBrrrr(data: CreatePropertyDto) {
  //   // 1. Unified Cash Flow Logic (Used by all sub-functions)
  //   const getOfficialCashFlow = (dto: CreatePropertyDto, mortgage: number) => {
  //     const annualIncome = dto.monthlyRent * 12;
  //     const vacancy = (dto.vacancyRate / 100) * annualIncome;
  //     const effectiveIncome = annualIncome - vacancy;

  //     const maintenance = (dto.maintenanceRate / 100) * effectiveIncome;
  //     const management = (dto.managementRate / 100) * effectiveIncome;
  //     const capex = (dto.capexRate / 100) * effectiveIncome;

  //     const totalAnnualExpenses =
  //       dto.annualPropertyTax +
  //       dto.annualInsurance +
  //       dto.annualUtilities +
  //       dto.annualOtherExpense +
  //       maintenance +
  //       management +
  //       capex;

  //     const monthlyExpenses = totalAnnualExpenses / 12;
  //     const monthlyCashFlow = dto.monthlyRent - monthlyExpenses - mortgage;

  //     return {
  //       monthly: Number(monthlyCashFlow.toFixed(2)),
  //       annual: Number((monthlyCashFlow * 12).toFixed(2)),
  //       totalAnnualExpenses,
  //     };
  //   };

  //   // 2. Internal Helper: Main CoC and Refinance Logic
  //   function calculateBrrrrMetrics(dto: CreatePropertyDto) {
  //     // --- DEFINITIONS ---
  //     const allInCost =
  //       dto.purchasePrice + dto.rehabCost + dto.closingCost + dto.holdingCost;
  //     const initialCashInvested =
  //       dto.downPayment + dto.rehabCost + dto.closingCost + dto.holdingCost;
  //     const initialLoanAmount = dto.purchasePrice - dto.downPayment;

  //     // --- REFINANCE PHASE ---
  //     const refinanceLoanAmount =
  //       (dto.refinanceLtv / 100) * dto.arvAfterRepairValue;

  //     // Correction: Cash Out = Refi Loan - Initial Loan Payoff - Refi Costs
  //     const cashOut =
  //       refinanceLoanAmount - initialLoanAmount - dto.refinanceCost;

  //     // Correction: Cash Left = Initial Cash Invested - Cash Out
  //     const cashLeftInDeal = initialCashInvested - cashOut;

  //     // Correction: Cash-Out % = Cash Out / Initial Invested
  //     const cashOutPercentage = (cashOut / initialCashInvested) * 100;

  //     // Post-Refi Mortgage
  //     const refiMonthlyRate = dto.refinanceInterestRate / 100 / 12;
  //     const refiMortgage =
  //       (refinanceLoanAmount * refiMonthlyRate) /
  //       (1 - Math.pow(1 + refiMonthlyRate, -(dto.refinanceLoanTerm * 12)));

  //     // Synchronized Cash Flow
  //     const flow = getOfficialCashFlow(dto, refiMortgage);
  //     const postRefiCoC =
  //       cashLeftInDeal > 0 ? (flow.annual / cashLeftInDeal) * 100 : 0;

  //     // NOI for Cap Rate & DSCR
  //     const effectiveIncome =
  //       dto.monthlyRent * 12 * (1 - dto.vacancyRate / 100);
  //     const noi =
  //       effectiveIncome -
  //       (dto.annualPropertyTax +
  //         dto.annualInsurance +
  //         dto.annualUtilities +
  //         dto.annualOtherExpense +
  //         ((dto.maintenanceRate + dto.managementRate + dto.capexRate) / 100) *
  //           effectiveIncome);

  //     return {
  //       allInCost,
  //       initialCashInvested,
  //       cashOut,
  //       cashLeftInDeal,
  //       cashOutPercentage,
  //       postRefiCoC,
  //       refiMortgage,
  //       flow,
  //       noi,
  //       onePercentRule: dto.monthlyRent >= allInCost * 0.01,
  //       capRate: (noi / dto.arvAfterRepairValue) * 100,
  //       dscr: refiMortgage * 12 > 0 ? noi / (refiMortgage * 12) : 0,
  //     };
  //   }

  //   const metrics = calculateBrrrrMetrics(data);

  //   // 3. Deterministic Deal Scoreboard
  //   const getDealScoreboard = (m: any) => {
  //     const scoreLookup = (val, good, avg) => {
  //       if (val >= good) return { score: 10, status: 'GOOD' };
  //       if (val >= avg) return { score: 5, status: 'AVERAGE' };
  //       return { score: 0, status: 'BAD' };
  //     };

  //     const breakdown = [
  //       {
  //         name: 'Cash Flow',
  //         value: m.flow.annual,
  //         ...scoreLookup(m.flow.annual, 3000, 1200),
  //       },
  //       {
  //         name: 'Post-Refi CoC',
  //         value: m.postRefiCoC,
  //         ...scoreLookup(m.postRefiCoC, 12, 6),
  //       },
  //       { name: 'Cap Rate', value: m.capRate, ...scoreLookup(m.capRate, 8, 5) },
  //       { name: 'DSCR', value: m.dscr, ...scoreLookup(m.dscr, 1.25, 1.0) },
  //       {
  //         name: '1% Rule (All-In)',
  //         value: m.onePercentRule,
  //         score: m.onePercentRule ? 10 : 0,
  //         status: m.onePercentRule ? 'GOOD' : 'BAD',
  //       },
  //     ];

  //     const totalScore = breakdown.reduce((sum, i) => sum + i.score, 0);
  //     const rating =
  //       totalScore >= 40
  //         ? 'GOOD DEAL'
  //         : totalScore >= 25
  //           ? 'AVERAGE DEAL'
  //           : 'BAD DEAL';

  //     return { totalScore, rating, breakdown };
  //   };

  //   return {
  //     strategy: 'BRRRR',
  //     stateAddress: data.stateAddress,
  //     purchasePrice: data.purchasePrice,
  //     downPayment: data.downPayment,
  //     annualInsurance: data.annualInsurance,
  //     annualPropertyTax: data.annualPropertyTax,
  //     vacancyRate: data.vacancyRate,
  //     maintenanceRate: data.maintenanceRate,
  //     managementRate: data.managementRate,
  //     capexRate: data.capexRate,
  //     responseData: {
  //       KeyMetrics: {
  //         allInCost: metrics.allInCost,
  //         initialCashInvested: metrics.initialCashInvested,
  //         monthlyCashFlow: metrics.flow.monthly,
  //         postRefiCoC: Number(metrics.postRefiCoC.toFixed(2)),
  //         cashOutAmount: Number(metrics.cashOut.toFixed(2)),
  //         cashLeftInDeal: Number(metrics.cashLeftInDeal.toFixed(2)),
  //         cashOutPercentage: Number(metrics.cashOutPercentage.toFixed(2)),
  //         capRate: Number(metrics.capRate.toFixed(2)),
  //         DSCR: Number(metrics.dscr.toFixed(2)),
  //         OnePercentRuleAllIn: metrics.onePercentRule,
  //         netOperatingIncome: Number(metrics.noi.toFixed(0)),
  //       },
  //       incomeExpance: {
  //         income: {
  //           monthlyRent: data.monthlyRent,
  //           annualRent: data.monthlyRent * 12,
  //           effectiveIncome:
  //             data.monthlyRent * 12 * (1 - data.vacancyRate / 100),
  //         },
  //         expenses: { totalExpenses: metrics.flow.totalAnnualExpenses },
  //         noi: metrics.noi,
  //         mortgage: {
  //           monthlyMortgage: Number(metrics.refiMortgage.toFixed(2)),
  //           annualMortgage: Number((metrics.refiMortgage * 12).toFixed(2)),
  //         },
  //         netCashFlow: metrics.flow,
  //       },
  //       dealScoreboard: getDealScoreboard(metrics),
  //     },
  //   };
  // }

  async calculateBrrrr(dto: CalculateBrrrPropertyDto) {
    // ---------------- Down Payment Logic ----------------
    const downPayment =
      dto.downPayment ?? (dto.purchasePrice * dto.downPaymentPercent) / 100;

    const loanAmount = dto.purchasePrice - downPayment;

    const loanPointsCost = (loanAmount * dto.loanPoints) / 100;

    // ---------------- Base Income ----------------
    const annualRent = dto.monthlyRent * 12;
    const effectiveIncome = annualRent * (1 - dto.vacancyRate / 100);

    // ---------------- Expenses ----------------
    const maintenance = (dto.maintenanceRate / 100) * effectiveIncome;
    const management = (dto.managementRate / 100) * effectiveIncome;
    const capex = (dto.capexRate / 100) * effectiveIncome;

    const totalExpenses =
      dto.annualPropertyTax +
      dto.annualInsurance +
      dto.annualUtilities +
      dto.annualOtherExpense +
      maintenance +
      management +
      capex;

    // ---------------- NOI ----------------
    const noi = effectiveIncome - totalExpenses;

    // ---------------- Refinance ----------------
    const refinanceLoanAmount =
      (dto.refinanceLtv / 100) * dto.arvAfterRepairValue;

    const refiRate = dto.refinanceInterestRate / 100 / 12;
    const refiPayments = dto.refinanceLoanTerm * 12;

    const refiMortgage =
      (refinanceLoanAmount * refiRate) /
      (1 - Math.pow(1 + refiRate, -refiPayments));

    // ---------------- Cash Flow ----------------
    const monthlyExpenses = totalExpenses / 12;

    const monthlyCashFlow = dto.monthlyRent - monthlyExpenses - refiMortgage;

    const annualCashFlow = monthlyCashFlow * 12;

    // ---------------- Investment ----------------
    const allInCost =
      dto.purchasePrice +
      dto.rehabCost +
      dto.closingCost +
      dto.holdingCost +
      loanPointsCost;

    const initialCashInvested =
      downPayment +
      dto.rehabCost +
      dto.closingCost +
      dto.holdingCost +
      loanPointsCost;

    // ---------------- BRRRR Core ----------------
    const cashOut = refinanceLoanAmount - loanAmount - dto.refinanceCost;

    const cashLeftInDeal = initialCashInvested - cashOut;

    const postRefiCoC =
      cashLeftInDeal > 0 ? (annualCashFlow / cashLeftInDeal) * 100 : 0;

    const equityCaptured = dto.arvAfterRepairValue - allInCost;

    const dscr = refiMortgage * 12 > 0 ? noi / (refiMortgage * 12) : 0;

    const capRate = (noi / dto.arvAfterRepairValue) * 100;

    // ---------------- FINAL ----------------
    return {
      strategy: 'BRRRR',
      stateAddress: dto.stateAddress,
      purchasePrice: dto.purchasePrice,
      downPayment,
      annualInsurance: dto.annualInsurance,
      annualPropertyTax: dto.annualPropertyTax,
      vacancyRate: dto.vacancyRate,
      maintenanceRate: dto.maintenanceRate,
      managementRate: dto.managementRate,
      capexRate: dto.capexRate,

      responseData: {
        KeyMetrics: {
          allInCost,
          initialCashInvested,
          monthlyCashFlow,
          postRefiCoC,
          cashOutAmount: cashOut,
          cashLeftInDeal,
          equityCaptured,
          refinanceLoanAmount,
          capRate,
          DSCR: dscr,
          netOperatingIncome: noi,
        },
        incomeExpance: {
          income: {
            monthlyRent: dto.monthlyRent,
            annualRent,
            effectiveIncome,
          },
          expenses: {
            totalExpenses,
          },
          noi,
          mortgage: {
            monthlyMortgage: refiMortgage,
            annualMortgage: refiMortgage * 12,
          },
          netCashFlow: {
            monthly: monthlyCashFlow,
            annual: annualCashFlow,
          },
          financing: {
            purchaseLoanAmount: loanAmount,
            refinanceLoanAmount,
            loanPointsCost,
          },
        },
      },
    };
  }

  // async generateTurnkeyReport(dto: CreatePropertyDto) {
  //   const allInCost =
  //     dto.purchasePrice + dto.rehabCost + dto.closingCost + dto.holdingCost;
  //   const initialCashInvested =
  //     dto.downPayment + dto.rehabCost + dto.closingCost + dto.holdingCost;
  //   const loanAmount = dto.purchasePrice - dto.downPayment;
  //   const monthlyRate = dto.interestRate / 100 / 12;
  //   const monthlyMortgage =
  //     (loanAmount * monthlyRate) /
  //     (1 - Math.pow(1 + monthlyRate, -(dto.loanTerm * 12)));

  //   // Re-using standardized cash flow logic
  //   const annualIncome = dto.monthlyRent * 12;
  //   const effectiveIncome = annualIncome * (1 - dto.vacancyRate / 100);
  //   const totalExpenses =
  //     dto.annualPropertyTax +
  //     dto.annualInsurance +
  //     dto.annualUtilities +
  //     dto.annualOtherExpense +
  //     ((dto.maintenanceRate + dto.managementRate + dto.capexRate) / 100) *
  //       effectiveIncome;

  //   const noi = effectiveIncome - totalExpenses;
  //   const monthlyCashFlow =
  //     dto.monthlyRent - totalExpenses / 12 - monthlyMortgage;
  //   const annualCashFlow = monthlyCashFlow * 12;

  //   const coc =
  //     initialCashInvested > 0
  //       ? (annualCashFlow / initialCashInvested) * 100
  //       : 0;
  //   const capRate = (noi / dto.purchasePrice) * 100;
  //   const dscr = monthlyMortgage * 12 > 0 ? noi / (monthlyMortgage * 12) : 0;
  //   const onePercentRule = dto.monthlyRent >= allInCost * 0.01;

  //   // Deterministic Scoring
  //   const scoreLookup = (val, good, avg) => {
  //     if (val >= good) return { score: 10, status: 'GOOD' };
  //     if (val >= avg) return { score: 5, status: 'AVERAGE' };
  //     return { score: 0, status: 'BAD' };
  //   };

  //   const breakdown = [
  //     {
  //       name: 'Cash Flow',
  //       value: annualCashFlow,
  //       ...scoreLookup(annualCashFlow, 3000, 1200),
  //     },
  //     { name: 'CoC Return', value: coc, ...scoreLookup(coc, 8, 5) },
  //     { name: 'Cap Rate', value: capRate, ...scoreLookup(capRate, 8, 5) },
  //     { name: 'DSCR', value: dscr, ...scoreLookup(dscr, 1.25, 1.0) },
  //     {
  //       name: '1% Rule (All-In)',
  //       value: onePercentRule,
  //       score: onePercentRule ? 10 : 0,
  //       status: onePercentRule ? 'GOOD' : 'BAD',
  //     },
  //   ];

  //   const totalScore = breakdown.reduce((sum, i) => sum + i.score, 0);

  //   return {
  //     strategy: 'TURNKEY',
  //     stateAddress: dto.stateAddress,
  //     purchasePrice: dto.purchasePrice,
  //     downPayment: dto.downPayment,
  //     annualInsurance: dto.annualInsurance,
  //     annualPropertyTax: dto.annualPropertyTax,
  //     vacancyRate: dto.vacancyRate,
  //     maintenanceRate: dto.maintenanceRate,
  //     managementRate: dto.managementRate,
  //     capexRate: dto.capexRate,
  //     responseData: {
  //       KeyMetrics: {
  //         allInCost,
  //         initialCashInvested,
  //         monthlyCashFlow: Number(monthlyCashFlow.toFixed(2)),
  //         CashOnCashReturn: Number(coc.toFixed(2)),
  //         capRate: Number(capRate.toFixed(2)),
  //         DSCR: Number(dscr.toFixed(2)),
  //         OnePercentRule: onePercentRule,
  //         netOperatingIncome: Number((noi / 12).toFixed(0)),
  //       },
  //       incomeExpance: {
  //         noi: Number(noi.toFixed(0)),
  //         netCashFlow: {
  //           monthly: Number(monthlyCashFlow.toFixed(2)),
  //           annual: Number(annualCashFlow.toFixed(2)),
  //         },
  //         mortgage: { monthlyMortgage: Number(monthlyMortgage.toFixed(2)) },
  //       },
  //       dealScoreboard: {
  //         totalScore,
  //         rating:
  //           totalScore >= 40
  //             ? 'GOOD DEAL'
  //             : totalScore >= 25
  //               ? 'AVERAGE DEAL'
  //               : 'BAD DEAL',
  //         breakdown,
  //       },
  //     },
  //   };
  // }

  async generateTurnkeyReport(dto: CalculateTurnkeyPropertyDto) {
    // ---------------- 1. Down Payment Logic ----------------
    const downPayment =
      dto.downPayment ??
      (dto.downPaymentPercent
        ? (dto.purchasePrice * dto.downPaymentPercent) / 100
        : 0);

    // ---------------- 2. Financing Structure ----------------
    const loanAmount = dto.purchasePrice - downPayment;

    const loanPointsCost = dto.loanPoints
      ? (loanAmount * dto.loanPoints) / 100
      : 0;

    const lenderFees = dto.lenderFees || 0;

    const totalFinancingCost = loanPointsCost + lenderFees;

    const monthlyRate = dto.interestRate / 100 / 12;
    const totalPayments = dto.loanTerm * 12;

    const monthlyMortgage =
      (loanAmount * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -totalPayments));

    const annualMortgage = monthlyMortgage * 12;

    // ---------------- 3. Investment ----------------
    const allInCost =
      dto.purchasePrice +
      dto.rehabCost +
      dto.closingCost +
      dto.holdingCost +
      totalFinancingCost;

    const initialCashInvested =
      downPayment +
      dto.rehabCost +
      dto.closingCost +
      dto.holdingCost +
      totalFinancingCost;

    // ---------------- 4. Income ----------------
    const annualRent = dto.monthlyRent * 12;
    const vacancyLoss = (dto.vacancyRate / 100) * annualRent;
    const effectiveIncome = annualRent - vacancyLoss;

    // ---------------- 5. Expenses ----------------
    const maintenance = (dto.maintenanceRate / 100) * effectiveIncome;
    const management = (dto.managementRate / 100) * effectiveIncome;
    const capex = (dto.capexRate / 100) * effectiveIncome;

    const totalExpenses =
      dto.annualPropertyTax +
      dto.annualInsurance +
      dto.annualUtilities +
      dto.annualOtherExpense +
      maintenance +
      management +
      capex;

    // ---------------- 6. NOI ----------------
    const noi = effectiveIncome - totalExpenses;

    // ---------------- 7. Cash Flow ----------------
    const monthlyCashFlow =
      dto.monthlyRent - totalExpenses / 12 - monthlyMortgage;

    const annualCashFlow = monthlyCashFlow * 12;

    // ---------------- 8. Metrics ----------------
    const coc =
      initialCashInvested > 0
        ? (annualCashFlow / initialCashInvested) * 100
        : 0;

    const capRate = (noi / dto.purchasePrice) * 100;

    const dscr = annualMortgage > 0 ? noi / annualMortgage : 0;

    const onePercentRule = dto.monthlyRent >= allInCost * 0.01;

    // ---------------- 9. External Data (Mock Integration Layer) ----------------
    const marketRent = dto.marketRent ?? dto.monthlyRent;
    const section8Rent = dto.section8Rent ?? dto.monthlyRent * 0.9;
    const crimeScore = dto.crimeScore ?? 50;

    const rentVsMarket = dto.monthlyRent / marketRent;

    // ---------------- 10. Scoring ----------------
    const scoreLookup = (val: number, good: number, avg: number) => {
      if (val >= good) return { score: 10, status: 'GOOD' };
      if (val >= avg) return { score: 5, status: 'AVERAGE' };
      return { score: 0, status: 'BAD' };
    };

    const breakdown = [
      {
        name: 'Cash Flow',
        value: annualCashFlow,
        ...scoreLookup(annualCashFlow, 3000, 1200),
      },
      { name: 'CoC Return', value: coc, ...scoreLookup(coc, 8, 5) },
      { name: 'Cap Rate', value: capRate, ...scoreLookup(capRate, 8, 5) },
      { name: 'DSCR', value: dscr, ...scoreLookup(dscr, 1.25, 1.0) },
      {
        name: '1% Rule',
        value: onePercentRule,
        score: onePercentRule ? 10 : 0,
        status: onePercentRule ? 'GOOD' : 'BAD',
      },
      {
        name: 'Rent vs Market',
        value: rentVsMarket,
        ...scoreLookup(rentVsMarket, 1, 0.9),
      },
      {
        name: 'Crime Score',
        value: crimeScore,
        ...scoreLookup(crimeScore, 70, 50),
      },
    ];

    const totalScore = breakdown.reduce((sum, i) => sum + i.score, 0);

    const rating =
      totalScore >= 40
        ? 'GOOD DEAL'
        : totalScore >= 25
          ? 'AVERAGE DEAL'
          : 'BAD DEAL';

    // ---------------- FINAL RESPONSE ----------------
    return {
      strategy: 'TURNKEY',
      stateAddress: dto.stateAddress,
      purchasePrice: dto.purchasePrice,
      downPayment: dto.downPayment,
      annualInsurance: dto.annualInsurance,
      annualPropertyTax: dto.annualPropertyTax,
      vacancyRate: dto.vacancyRate,
      maintenanceRate: dto.maintenanceRate,
      managementRate: dto.managementRate,
      capexRate: dto.capexRate,
      responseData: {
        KeyMetrics: {
          allInCost,
          initialCashInvested,
          loanAmount,
          loanPointsCost,
          lenderFees,

          monthlyCashFlow: Number(monthlyCashFlow.toFixed(2)),
          CashOnCashReturn: Number(coc.toFixed(2)),
          capRate: Number(capRate.toFixed(2)),
          DSCR: Number(dscr.toFixed(2)),
          OnePercentRule: onePercentRule,
          netOperatingIncome: Number(noi.toFixed(0)),
        },

        incomeExpance: {
          noi: Number(noi.toFixed(0)),
          mortgage: {
            monthlyMortgage: Number(monthlyMortgage.toFixed(2)),
            annualMortgage: Number(annualMortgage.toFixed(2)),
          },
          netCashFlow: {
            monthly: Number(monthlyCashFlow.toFixed(2)),
            annual: Number(annualCashFlow.toFixed(2)),
          },
        },

        dealScoreboard: {
          totalScore,
          rating,
          breakdown,
        },
      },
    };
  }

  // async generateSection8_DSCR(dto: CreatePropertyDto) {
  //   // Section 8 focuses primarily on DSCR and fixed income stability
  //   const loanAmount = dto.purchasePrice - dto.downPayment;
  //   const monthlyRate = dto.interestRate / 100 / 12;
  //   const monthlyMortgage =
  //     (loanAmount * monthlyRate) /
  //     (1 - Math.pow(1 + monthlyRate, -(dto.loanTerm * 12)));

  //   const annualIncome = dto.monthlyRent * 12;
  //   const effectiveIncome = annualIncome * (1 - dto.vacancyRate / 100);
  //   const totalExpenses =
  //     dto.annualPropertyTax +
  //     dto.annualInsurance +
  //     dto.annualUtilities +
  //     dto.annualOtherExpense +
  //     ((dto.maintenanceRate + dto.managementRate + dto.capexRate) / 100) *
  //       effectiveIncome;

  //   const noi = effectiveIncome - totalExpenses;
  //   const dscr = monthlyMortgage * 12 > 0 ? noi / (monthlyMortgage * 12) : 0;
  //   const monthlyCashFlow =
  //     dto.monthlyRent - totalExpenses / 12 - monthlyMortgage;

  //   const dscrScore =
  //     dscr >= 1.25
  //       ? { score: 10, status: 'GOOD' }
  //       : dscr >= 1.1
  //         ? { score: 5, status: 'AVERAGE' }
  //         : { score: 0, status: 'BAD' };

  //   return {
  //     strategy: 'SECTION_8',
  //     stateAddress: dto.stateAddress,
  //     purchasePrice: dto.purchasePrice,
  //     downPayment: dto.downPayment,
  //     annualInsurance: dto.annualInsurance,
  //     annualPropertyTax: dto.annualPropertyTax,
  //     vacancyRate: dto.vacancyRate,
  //     maintenanceRate: dto.maintenanceRate,
  //     managementRate: dto.managementRate,
  //     capexRate: dto.capexRate,
  //     responseData: {
  //       KeyMetrics: {
  //         DSCR: Number(dscr.toFixed(2)),
  //         netOperatingIncome: Number(noi.toFixed(0)),
  //         monthlyCashFlow: Number(monthlyCashFlow.toFixed(2)),
  //       },
  //       dealScoreboard: {
  //         totalScore: dscrScore.score,
  //         rating: dscrScore.status
  //           ? dscrScore.status == 'GOOD'
  //             ? 'GOOD DEAL'
  //             : dscrScore.status == 'AVERAGE'
  //               ? 'AVERAGE DEAL'
  //               : 'BAD DEAL'
  //           : 'BAD DEAL',
  //         breakdown: [
  //           { name: 'DSCR', value: Number(dscr.toFixed(2)), ...dscrScore },
  //         ],
  //       },
  //     },
  //   };
  // }

  async generateSection8_DSCR(dto: CreatePropertyDto) {
    // ---------------- 1. LOAN ----------------
    const loanAmount = dto.purchasePrice - dto.downPayment;

    const monthlyRate = dto.interestRate / 100 / 12;

    const monthlyMortgage =
      (loanAmount * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -(dto.loanTerm * 12)));

    const annualDebtService = monthlyMortgage * 12;

    // ---------------- 2. SECTION 8 RENT (CAPPED MODEL) ----------------
    const hudCap = dto.monthlyRent * 1.05; // stable cap logic

    const section8Rent = Math.min(dto.monthlyRent, hudCap);

    const annualIncome = section8Rent * 12;

    // Section 8 stability (government-backed)
    const stabilityFactor = 0.98;

    const effectiveIncome = annualIncome * stabilityFactor;

    // ---------------- 3. EXPENSES ----------------
    const operatingExpenses =
      dto.annualPropertyTax +
      dto.annualInsurance +
      dto.annualUtilities +
      dto.annualOtherExpense;

    const maintenance = (dto.maintenanceRate / 100) * effectiveIncome;
    const management = (dto.managementRate / 100) * effectiveIncome;
    const capex = (dto.capexRate / 100) * effectiveIncome;

    // Section 8 compliance overhead
    const complianceCost = 600;

    const totalExpenses =
      operatingExpenses + maintenance + management + capex + complianceCost;

    // ---------------- 4. NOI ----------------
    const noi = effectiveIncome - totalExpenses;

    // ---------------- 5. RISK ADJUSTED DSCR ----------------
    const riskFactor = 1.05;

    const riskAdjustedNOI = noi * riskFactor;

    const dscr =
      annualDebtService > 0 ? riskAdjustedNOI / annualDebtService : 0;

    // ---------------- 6. CASH FLOW ----------------
    const monthlyCashFlow = section8Rent - totalExpenses / 12 - monthlyMortgage;

    // ---------------- 7. SCORING ----------------
    const score = dscr >= 1.25 ? 10 : dscr >= 1.1 ? 5 : 0;

    const rating =
      dscr >= 1.25 ? 'GOOD DEAL' : dscr >= 1.1 ? 'AVERAGE DEAL' : 'BAD DEAL';

    // ---------------- FINAL RESPONSE ----------------
    return {
      strategy: 'SECTION_8',

      responseData: {
        KeyMetrics: {
          DSCR: Number(dscr.toFixed(2)),
          netOperatingIncome: Number(noi.toFixed(0)),
          monthlyCashFlow: Number(monthlyCashFlow.toFixed(2)),

          section8Rent: Number(section8Rent.toFixed(0)),
          hudCap: Number(hudCap.toFixed(0)),
          stabilityFactor,
        },

        dealScoreboard: {
          totalScore: score,
          rating,
          breakdown: [
            {
              name: 'DSCR',
              value: Number(dscr.toFixed(2)),
              score,
              status: dscr >= 1.25 ? 'GOOD' : dscr >= 1.1 ? 'AVERAGE' : 'BAD',
            },
          ],
        },
      },
    };
  }

  async getAllCalculationsForUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // ensure valid values
    const currentPage = Number(page) || 1;
    const perPage = Number(limit) || 10;

    const skip = (currentPage - 1) * perPage;

    // total count (VERY IMPORTANT)
    const total = await this.prisma.propertyCalculation.count({
      where: { userId: userId },
    });

    // fetch paginated data
    const records = await this.prisma.propertyCalculation.findMany({
      where: { userId: userId },
      include: { breakdown: true },
      skip,
      take: perPage,
      orderBy: {
        createdAt: 'desc', // optional but recommended
      },
    });

    // total pages calculation
    const totalPages = Math.ceil(total / perPage);

    return {
      data: records,
      meta: {
        total,
        page: currentPage,
        limit: perPage,
        totalPages,
      },
    };
  }

  async getCalculationById(propertyId: string) {
    return await this.prisma.propertyCalculation.findUnique({
      where: { propertyId },
      include: { breakdown: true },
    });
  }

  async deleteCalculationById(propertyId: string, userId: string) {
    const record = await this.prisma.propertyCalculation.findUnique({
      where: { propertyId: propertyId },
    });

    if (!record || record.userId !== userId) {
      throw new Error('You are not authorized to delete this record.');
    }

    return await this.prisma.propertyCalculation.delete({
      where: { propertyId },
    });
  }

  async saveBrrrProperty(userId: string, dto: SaveBrrrPropertyDataDto) {
    const {
      strategy,
      stateAddress,
      purchasePrice,
      downPayment,
      annualInsurance,
      annualPropertyTax,
      vacancyRate,
      maintenanceRate,
      managementRate,
      capexRate,
      responseData,
    } = dto;

    // ✅ FIXED
    const KeyMetrics = responseData?.KeyMetrics;
    const incomeExpance = responseData?.incomeExpance;
    const dealScoreboard = responseData?.dealScoreboard;
    const totalScore = dealScoreboard?.totalScore || 0;
    const scoreBoardStatus = dealScoreboard?.rating;

    const data: any = {
      name: dto.name,
      userId,
      strategy,
      stateAddress,

      totalScore: totalScore,
      scoreBoardStatus: scoreBoardStatus,

      //   Static Data
      purchasePrice: purchasePrice,
      downPayment: downPayment,
      annualInsurance: annualInsurance,
      annualPropertyTax: annualPropertyTax,
      vacancyRate: vacancyRate,
      maintenanceRate: maintenanceRate,
      managementRate: managementRate,
      capexRate: capexRate,

      // --- KEY METRICS ---
      allInCost: KeyMetrics?.allInCost,
      initialCashInvested: KeyMetrics?.initialCashInvested,
      monthlyCashFlow: KeyMetrics?.monthlyCashFlow,
      cashOnCashReturn: KeyMetrics?.postRefiCoC,
      capRate: KeyMetrics?.capRate,
      dscr: KeyMetrics?.DSCR,
      onePercentRule: KeyMetrics?.OnePercentRuleAllIn,
      netOperatingIncome: KeyMetrics?.netOperatingIncome,

      // --- INCOME ---
      monthlyRent: incomeExpance?.income?.monthlyRent,
      annualRent: incomeExpance?.income?.annualRent,
      effectiveIncome: incomeExpance?.income?.effectiveIncome,

      // --- EXPENSE ---
      totalExpenses: incomeExpance?.expenses?.totalExpenses,
      noi: incomeExpance?.noi,

      // --- MORTGAGE ---
      monthlyMortgage: incomeExpance?.mortgage?.monthlyMortgage,
      mortgage: incomeExpance?.mortgage?.annualMortgage,

      // --- ANNUAL ---
      annualNoi: incomeExpance?.noi,
      annualNetCashFlow: incomeExpance?.netCashFlow?.annual,
    };

    const property = await this.prisma.propertyCalculation.create({
      data,
    });

    const breakdown = dealScoreboard?.breakdown || [];

    if (breakdown.length > 0) {
      await this.prisma.scoreBreakdown.createMany({
        data: breakdown.map((item: any) => ({
          propertyId: property.propertyId,
          name: item.name,
          value:
            typeof item.value === 'boolean' ? (item.value ? 1 : 0) : item.value,
          score: item.score,
          status: item.status,
        })),
      });
    }

    return {
      message: 'Property saved successfully',
    };
  }

  async saveTurnkeyProperty(userId: string, dto: SaveBrrrPropertyDataDto) {
    const {
      strategy,
      stateAddress,
      purchasePrice,
      downPayment,
      annualInsurance,
      annualPropertyTax,
      vacancyRate,
      maintenanceRate,
      managementRate,
      capexRate,
      responseData,
    } = dto;

    // ✅ Correct extraction
    const KeyMetrics = responseData?.KeyMetrics;
    const incomeExpance = responseData?.incomeExpance;
    const dealScoreboard = responseData?.dealScoreboard;

    // ✅ 1. Prepare flat data
    const data: any = {
      name: dto.name,
      userId,
      strategy,
      stateAddress,

      purchasePrice,
      downPayment,
      annualInsurance,
      annualPropertyTax,
      vacancyRate,
      maintenanceRate,
      managementRate,
      capexRate,

      // --- KEY METRICS ---
      allInCost: KeyMetrics?.allInCost,
      initialCashInvested: KeyMetrics?.initialCashInvested,
      monthlyCashFlow: KeyMetrics?.monthlyCashFlow,
      cashOnCashReturn: KeyMetrics?.postRefiCoC,
      capRate: KeyMetrics?.capRate,
      dscr: KeyMetrics?.DSCR,
      onePercentRule: KeyMetrics?.OnePercentRuleAllIn,
      netOperatingIncome: KeyMetrics?.netOperatingIncome,

      // --- INCOME ---
      monthlyRent: incomeExpance?.income?.monthlyRent,
      annualRent: incomeExpance?.income?.annualRent,
      effectiveIncome: incomeExpance?.income?.effectiveIncome,

      // --- EXPENSE ---
      totalExpenses: incomeExpance?.expenses?.totalExpenses,
      noi: incomeExpance?.noi,

      // --- MORTGAGE ---
      monthlyMortgage: incomeExpance?.mortgage?.monthlyMortgage,
      mortgage: incomeExpance?.mortgage?.annualMortgage,

      // --- ANNUAL ---
      annualNoi: incomeExpance?.noi,
      annualNetCashFlow: incomeExpance?.netCashFlow?.annual,

      // --- SCOREBOARD (optional main table fields) ---
      totalScore: dealScoreboard?.totalScore,
      scoreBoardStatus: dealScoreboard?.rating,
    };

    // ✅ 2. Save Property
    const property = await this.prisma.propertyCalculation.create({
      data,
    });

    // ✅ 3. Save Breakdown
    const breakdown = dealScoreboard?.breakdown || [];

    if (breakdown.length > 0) {
      await this.prisma.scoreBreakdown.createMany({
        data: breakdown.map((item: any) => ({
          propertyId: property.propertyId,
          name: item.name,
          value:
            typeof item.value === 'boolean' ? (item.value ? 1 : 0) : item.value,
          score: item.score,
          status: item.status,
        })),
      });
    }

    // ✅ 4. Return
    return {
      message: 'Turnkey Property saved successfully',
    };
  }

  async saveSection8Property(userId: string, dto: SaveSection8PropertyDataDto) {
    const {
      strategy,
      stateAddress,
      purchasePrice,
      downPayment,
      annualInsurance,
      annualPropertyTax,
      vacancyRate,
      maintenanceRate,
      managementRate,
      capexRate,
      responseData,
    } = dto;

    const KeyMetrics = responseData?.KeyMetrics;
    const dealScoreboard = responseData?.dealScoreboard;

    // ✅ 1. Prepare flat data
    const data: any = {
      name: dto.name,
      userId,
      strategy,
      stateAddress,

      purchasePrice,
      downPayment,
      annualInsurance,
      annualPropertyTax,
      vacancyRate,
      maintenanceRate,
      managementRate,
      capexRate,

      // --- KEY METRICS ---
      monthlyCashFlow: KeyMetrics?.monthlyCashFlow,
      netOperatingIncome: KeyMetrics?.netOperatingIncome,
      dscr: KeyMetrics?.DSCR,

      // --- SCOREBOARD MAIN ---
      totalScore: dealScoreboard?.totalScore,
      scoreBoardStatus: dealScoreboard?.rating,
    };

    // ✅ 2. Save Property
    const property = await this.prisma.propertyCalculation.create({
      data,
    });

    // ✅ 3. Save Breakdown
    const breakdown = dealScoreboard?.breakdown || [];

    if (breakdown.length > 0) {
      await this.prisma.scoreBreakdown.createMany({
        data: breakdown.map((item: any) => ({
          propertyId: property.propertyId,
          name: item.name,
          value:
            typeof item.value === 'boolean' ? (item.value ? 1 : 0) : item.value,
          score: item.score,
          status: item.status,
        })),
      });
    }

    // ✅ 4. Return response
    return {
      message: 'Section 8 Property saved successfully',
    };
  }
}
