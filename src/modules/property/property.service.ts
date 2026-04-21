import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create.property.dto';
import { SaveBrrrPropertyDataDto } from './dto/save.brrrr.property.data.dto';
import { SaveSection8PropertyDataDto } from './dto/save.section8.property.dto';

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  async calculateBrrrr(data: CreatePropertyDto) {
    // 1. Unified Cash Flow Logic (Used by all sub-functions)
    const getOfficialCashFlow = (dto: CreatePropertyDto, mortgage: number) => {
      const annualIncome = dto.monthlyRent * 12;
      const vacancy = (dto.vacancyRate / 100) * annualIncome;
      const effectiveIncome = annualIncome - vacancy;

      const maintenance = (dto.maintenanceRate / 100) * effectiveIncome;
      const management = (dto.managementRate / 100) * effectiveIncome;
      const capex = (dto.capexRate / 100) * effectiveIncome;

      const totalAnnualExpenses =
        dto.annualPropertyTax +
        dto.annualInsurance +
        dto.annualUtilities +
        dto.annualOtherExpense +
        maintenance +
        management +
        capex;

      const monthlyExpenses = totalAnnualExpenses / 12;
      const monthlyCashFlow = dto.monthlyRent - monthlyExpenses - mortgage;

      return {
        monthly: Number(monthlyCashFlow.toFixed(2)),
        annual: Number((monthlyCashFlow * 12).toFixed(2)),
        totalAnnualExpenses,
      };
    };

    // 2. Internal Helper: Main CoC and Refinance Logic
    function calculateBrrrrMetrics(dto: CreatePropertyDto) {
      // --- DEFINITIONS ---
      const allInCost =
        dto.purchasePrice + dto.rehabCost + dto.closingCost + dto.holdingCost;
      const initialCashInvested =
        dto.downPayment + dto.rehabCost + dto.closingCost + dto.holdingCost;
      const initialLoanAmount = dto.purchasePrice - dto.downPayment;

      // --- REFINANCE PHASE ---
      const refinanceLoanAmount =
        (dto.refinanceLtv / 100) * dto.arvAfterRepairValue;

      // Correction: Cash Out = Refi Loan - Initial Loan Payoff - Refi Costs
      const cashOut =
        refinanceLoanAmount - initialLoanAmount - dto.refinanceCost;

      // Correction: Cash Left = Initial Cash Invested - Cash Out
      const cashLeftInDeal = initialCashInvested - cashOut;

      // Correction: Cash-Out % = Cash Out / Initial Invested
      const cashOutPercentage = (cashOut / initialCashInvested) * 100;

      // Post-Refi Mortgage
      const refiMonthlyRate = dto.refinanceInterestRate / 100 / 12;
      const refiMortgage =
        (refinanceLoanAmount * refiMonthlyRate) /
        (1 - Math.pow(1 + refiMonthlyRate, -(dto.refinanceLoanTerm * 12)));

      // Synchronized Cash Flow
      const flow = getOfficialCashFlow(dto, refiMortgage);
      const postRefiCoC =
        cashLeftInDeal > 0 ? (flow.annual / cashLeftInDeal) * 100 : 0;

      // NOI for Cap Rate & DSCR
      const effectiveIncome =
        dto.monthlyRent * 12 * (1 - dto.vacancyRate / 100);
      const noi =
        effectiveIncome -
        (dto.annualPropertyTax +
          dto.annualInsurance +
          dto.annualUtilities +
          dto.annualOtherExpense +
          ((dto.maintenanceRate + dto.managementRate + dto.capexRate) / 100) *
            effectiveIncome);

      return {
        allInCost,
        initialCashInvested,
        cashOut,
        cashLeftInDeal,
        cashOutPercentage,
        postRefiCoC,
        refiMortgage,
        flow,
        noi,
        onePercentRule: dto.monthlyRent >= allInCost * 0.01,
        capRate: (noi / dto.arvAfterRepairValue) * 100,
        dscr: refiMortgage * 12 > 0 ? noi / (refiMortgage * 12) : 0,
      };
    }

    const metrics = calculateBrrrrMetrics(data);

    // 3. Deterministic Deal Scoreboard
    const getDealScoreboard = (m: any) => {
      const scoreLookup = (val, good, avg) => {
        if (val >= good) return { score: 10, status: 'GOOD' };
        if (val >= avg) return { score: 5, status: 'AVERAGE' };
        return { score: 0, status: 'BAD' };
      };

      const breakdown = [
        {
          name: 'Cash Flow',
          value: m.flow.annual,
          ...scoreLookup(m.flow.annual, 3000, 1200),
        },
        {
          name: 'Post-Refi CoC',
          value: m.postRefiCoC,
          ...scoreLookup(m.postRefiCoC, 12, 6),
        },
        { name: 'Cap Rate', value: m.capRate, ...scoreLookup(m.capRate, 8, 5) },
        { name: 'DSCR', value: m.dscr, ...scoreLookup(m.dscr, 1.25, 1.0) },
        {
          name: '1% Rule (All-In)',
          value: m.onePercentRule,
          score: m.onePercentRule ? 10 : 0,
          status: m.onePercentRule ? 'GOOD' : 'BAD',
        },
      ];

      const totalScore = breakdown.reduce((sum, i) => sum + i.score, 0);
      const rating =
        totalScore >= 40
          ? 'GOOD DEAL'
          : totalScore >= 25
            ? 'AVERAGE DEAL'
            : 'BAD DEAL';

      return { totalScore, rating, breakdown };
    };

    return {
      KeyMetrics: {
        allInCost: metrics.allInCost,
        initialCashInvested: metrics.initialCashInvested,
        monthlyCashFlow: metrics.flow.monthly,
        postRefiCoC: Number(metrics.postRefiCoC.toFixed(2)),
        cashOutAmount: Number(metrics.cashOut.toFixed(2)),
        cashLeftInDeal: Number(metrics.cashLeftInDeal.toFixed(2)),
        cashOutPercentage: Number(metrics.cashOutPercentage.toFixed(2)),
        capRate: Number(metrics.capRate.toFixed(2)),
        DSCR: Number(metrics.dscr.toFixed(2)),
        OnePercentRuleAllIn: metrics.onePercentRule,
        netOperatingIncome: Number(metrics.noi.toFixed(0)),
      },
      incomeExpance: {
        income: {
          monthlyRent: data.monthlyRent,
          annualRent: data.monthlyRent * 12,
          effectiveIncome: data.monthlyRent * 12 * (1 - data.vacancyRate / 100),
        },
        expenses: { totalExpenses: metrics.flow.totalAnnualExpenses },
        noi: metrics.noi,
        mortgage: {
          monthlyMortgage: Number(metrics.refiMortgage.toFixed(2)),
          annualMortgage: Number((metrics.refiMortgage * 12).toFixed(2)),
        },
        netCashFlow: metrics.flow,
      },
      dealScoreboard: getDealScoreboard(metrics),
    };
  }

  async generateTurnkeyReport(dto: CreatePropertyDto) {
    const allInCost =
      dto.purchasePrice + dto.rehabCost + dto.closingCost + dto.holdingCost;
    const initialCashInvested =
      dto.downPayment + dto.rehabCost + dto.closingCost + dto.holdingCost;
    const loanAmount = dto.purchasePrice - dto.downPayment;
    const monthlyRate = dto.interestRate / 100 / 12;
    const monthlyMortgage =
      (loanAmount * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -(dto.loanTerm * 12)));

    // Re-using standardized cash flow logic
    const annualIncome = dto.monthlyRent * 12;
    const effectiveIncome = annualIncome * (1 - dto.vacancyRate / 100);
    const totalExpenses =
      dto.annualPropertyTax +
      dto.annualInsurance +
      dto.annualUtilities +
      dto.annualOtherExpense +
      ((dto.maintenanceRate + dto.managementRate + dto.capexRate) / 100) *
        effectiveIncome;

    const noi = effectiveIncome - totalExpenses;
    const monthlyCashFlow =
      dto.monthlyRent - totalExpenses / 12 - monthlyMortgage;
    const annualCashFlow = monthlyCashFlow * 12;

    const coc =
      initialCashInvested > 0
        ? (annualCashFlow / initialCashInvested) * 100
        : 0;
    const capRate = (noi / dto.purchasePrice) * 100;
    const dscr = monthlyMortgage * 12 > 0 ? noi / (monthlyMortgage * 12) : 0;
    const onePercentRule = dto.monthlyRent >= allInCost * 0.01;

    // Deterministic Scoring
    const scoreLookup = (val, good, avg) => {
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
        name: '1% Rule (All-In)',
        value: onePercentRule,
        score: onePercentRule ? 10 : 0,
        status: onePercentRule ? 'GOOD' : 'BAD',
      },
    ];

    const totalScore = breakdown.reduce((sum, i) => sum + i.score, 0);

    return {
      KeyMetrics: {
        allInCost,
        initialCashInvested,
        monthlyCashFlow: Number(monthlyCashFlow.toFixed(2)),
        CashOnCashReturn: Number(coc.toFixed(2)),
        capRate: Number(capRate.toFixed(2)),
        DSCR: Number(dscr.toFixed(2)),
        OnePercentRule: onePercentRule,
        netOperatingIncome: Number((noi / 12).toFixed(0)),
      },
      incomeExpance: {
        noi: Number(noi.toFixed(0)),
        netCashFlow: {
          monthly: Number(monthlyCashFlow.toFixed(2)),
          annual: Number(annualCashFlow.toFixed(2)),
        },
        mortgage: { monthlyMortgage: Number(monthlyMortgage.toFixed(2)) },
      },
      dealScoreboard: {
        totalScore,
        rating:
          totalScore >= 40
            ? 'GOOD DEAL'
            : totalScore >= 25
              ? 'AVERAGE DEAL'
              : 'BAD DEAL',
        breakdown,
      },
    };
  }

  async generateSection8_DSCR(dto: CreatePropertyDto) {
    // Section 8 focuses primarily on DSCR and fixed income stability
    const loanAmount = dto.purchasePrice - dto.downPayment;
    const monthlyRate = dto.interestRate / 100 / 12;
    const monthlyMortgage =
      (loanAmount * monthlyRate) /
      (1 - Math.pow(1 + monthlyRate, -(dto.loanTerm * 12)));

    const annualIncome = dto.monthlyRent * 12;
    const effectiveIncome = annualIncome * (1 - dto.vacancyRate / 100);
    const totalExpenses =
      dto.annualPropertyTax +
      dto.annualInsurance +
      dto.annualUtilities +
      dto.annualOtherExpense +
      ((dto.maintenanceRate + dto.managementRate + dto.capexRate) / 100) *
        effectiveIncome;

    const noi = effectiveIncome - totalExpenses;
    const dscr = monthlyMortgage * 12 > 0 ? noi / (monthlyMortgage * 12) : 0;
    const monthlyCashFlow =
      dto.monthlyRent - totalExpenses / 12 - monthlyMortgage;

    const dscrScore =
      dscr >= 1.25
        ? { score: 10, status: 'GOOD' }
        : dscr >= 1.1
          ? { score: 5, status: 'AVERAGE' }
          : { score: 0, status: 'BAD' };

    return {
      KeyMetrics: {
        DSCR: Number(dscr.toFixed(2)),
        netOperatingIncome: Number(noi.toFixed(0)),
        monthlyCashFlow: Number(monthlyCashFlow.toFixed(2)),
      },
      dealScoreboard: {
        totalScore: dscrScore.score,
        rating: dscrScore.status ? dscrScore.status == 'GOOD' ? 'GOOD DEAL' : dscrScore.status == 'AVERAGE' ? 'AVERAGE DEAL' : 'BAD DEAL' : 'BAD DEAL',
        breakdown: [
          { name: 'DSCR', value: Number(dscr.toFixed(2)), ...dscrScore },
        ],
      },
    };
  }

  async getAllCalculationsForUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const records = await this.prisma.propertyCalculation.findMany({
      where: { userId },
      include: { breakdown: true },
      skip: (page - 1) * limit,
      take: limit,
    });
    return records;
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
      message: 'Property saved successfully'
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
      message: 'Turnkey Property saved successfully'
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
      message: 'Section 8 Property saved successfully'
    };
  }
}
