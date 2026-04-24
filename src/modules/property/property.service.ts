import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePropertyDto } from './dto/create.property.dto';
import { CalculateBrrrPropertyDto } from './dto/calculate.brrrr.property.dto';
import { CalculateTurnkeyPropertyDto } from './dto/calculate.turnkey.property.dto';
import { CreateBrrrrDto } from './dto/create.save.brrr.property.dto';
import { CreateTurkenyDTO_Mod } from './dto/save .turkeny.property.dto';
import { Section8RequestDto } from './dto/section.e.request.dto';

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

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

    const scoreLookup = (val: number, good: number, avg: number) => {
      if (val >= good) return { score: 10, status: 'GOOD' };
      if (val >= avg) return { score: 5, status: 'AVERAGE' };
      return { score: 0, status: 'BAD' };
    };

    const onePercentRule = dto.monthlyRent >= allInCost * 0.01;

    const breakdown = [
      {
        name: 'Cash Flow',
        value: annualCashFlow,
        ...scoreLookup(annualCashFlow, 3000, 1200),
      },
      {
        name: 'Post-Refi CoC',
        value: postRefiCoC,
        ...scoreLookup(postRefiCoC, 12, 6),
      },
      {
        name: 'Cap Rate',
        value: capRate,
        ...scoreLookup(capRate, 8, 5),
      },
      {
        name: 'DSCR',
        value: dscr,
        ...scoreLookup(dscr, 1.25, 1.0),
      },
      {
        name: '1% Rule (All-In)',
        value: onePercentRule,
        score: onePercentRule ? 10 : 0,
        status: onePercentRule ? 'GOOD' : 'BAD',
      },
    ];

    const totalScore = breakdown.reduce((sum, i) => sum + i.score, 0);

    const rating =
      totalScore >= 40
        ? 'GOOD DEAL'
        : totalScore >= 25
          ? 'AVERAGE DEAL'
          : 'BAD DEAL';

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

      // KeyMetrics
      allInCost_m: allInCost,
      initialCashInvested_m: initialCashInvested,
      monthlyCashFlow_m: monthlyCashFlow,
      postRefiCoC_m: postRefiCoC,
      cashOutAmount_m: cashOut,
      cashLeftInDeal_m: cashLeftInDeal,
      equityCaptured_m: equityCaptured,
      refinanceLoanAmount_m: refinanceLoanAmount,
      capRate_m: capRate,
      DSCR_m: dscr,
      netOperatingIncome_m: noi,
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
      dealScoreboard: {
        totalScore,
        rating,
        breakdown,
      },
    };
  }
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
      stateAddress: dto.stateAddress,
      purchasePrice: dto.purchasePrice,
      downPayment: dto.downPayment,
      annualInsurance: dto.annualInsurance,
      annualPropertyTax: dto.annualPropertyTax,
      vacancyRate: dto.vacancyRate,
      maintenanceRate: dto.maintenanceRate,
      managementRate: dto.managementRate,
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

  async saveBrrrProperty(userId: string, dto: CreateBrrrrDto) {
    const property = await this.prisma.propertyCalculation.create({
      data: {
        strategy: 'BRRRR',
        name: dto.name,
        stateAddress: dto.stateAddress,
        purchasePrice: dto.purchasePrice,
        downPayment: dto.downPayment,
        annualInsurance: dto.annualInsurance,
        annualPropertyTax: dto.annualPropertyTax,
        vacancyRate: dto.vacancyRate,
        maintenanceRate: dto.maintenanceRate,
        managementRate: dto.managementRate,
        capexRate: dto.capRate_m,
        allInCost: dto.allInCost_m,
        initialCashInvested: dto.initialCashInvested_m,
        monthlyNetCashFlow: dto.monthlyCashFlow_m,
        postRefiCoC: dto.postRefiCoC_m,
        cashOutAmount: dto.cashOutAmount_m,
        cashLeftInDeal: dto.cashLeftInDeal_m,
        equityCaptured: dto.equityCaptured_m,
        refinanceLoanAmount: dto.refinanceLoanAmount_m,
        capRate: dto.capRate_m,
        netOperatingIncome: dto.netOperatingIncome_m,
        dscr: dto.DSCR_m,
        userId: userId,
        monthlyRent: dto.incomeExpance.income.monthlyRent,
        annualRent: dto.incomeExpance.income.annualRent,
        effectiveIncome: dto.incomeExpance.income.effectiveIncome,
        totalExpenses: dto.incomeExpance.expenses.totalExpenses,
        noi: dto.incomeExpance.noi,
        monthlyMortgage: dto.incomeExpance.mortgage.monthlyMortgage,
        annualMortgage: dto.incomeExpance.mortgage.annualMortgage,
        annualNetCashFlow: dto.incomeExpance.netCashFlow.annual,
        purchaseLoanAmount: dto.incomeExpance.financing.purchaseLoanAmount,
        loanPointsCost: dto.incomeExpance.financing.loanPointsCost,
        totalScore: dto.dealScoreboard.totalScore,
        scoreBoardStatus: dto.dealScoreboard.rating,
      },
    });

    if (dto.dealScoreboard.breakdown.length > 0) {
      await this.prisma.scoreBreakdown.createMany({
        data: dto.dealScoreboard.breakdown.map((item: any) => ({
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
      data: property,
    };
  }

  async saveTurnkeyProperty(userId: string, dto: CreateTurkenyDTO_Mod) {
    const property = await this.prisma.propertyCalculation.create({
      data: {
        strategy: 'TURNKEY',
        name: dto.name,
        stateAddress: dto.stateAddress,
        purchasePrice: dto.purchasePrice,
        downPayment: dto.downPayment,
        annualInsurance: dto.annualInsurance,
        annualPropertyTax: dto.annualPropertyTax,
        vacancyRate: dto.vacancyRate,
        maintenanceRate: dto.maintenanceRate,
        managementRate: dto.managementRate,
        capexRate: dto.capexRate,
        userId: userId,
        allInCost: dto.responseData.KeyMetrics.allInCost,
        initialCashInvested: dto.responseData.KeyMetrics.initialCashInvested,
        monthlyNetCashFlow: dto.responseData.KeyMetrics.monthlyCashFlow,
        cashOnCashReturn: dto.responseData.KeyMetrics.CashOnCashReturn,
        capRate: dto.responseData.KeyMetrics.capRate,
        dscr: dto.responseData.KeyMetrics.DSCR,
        onePercentRule: dto.responseData.KeyMetrics.OnePercentRule,
        netOperatingIncome: dto.responseData.KeyMetrics.netOperatingIncome,
        noi: dto.responseData.incomeExpance.noi,
        monthlyMortgage:
          dto.responseData.incomeExpance.mortgage.monthlyMortgage,
        annualNetCashFlow: dto.responseData.incomeExpance.netCashFlow.annual,
        scoreBoardStatus: dto.responseData.dealScoreboard.rating,
        totalScore: dto.responseData.dealScoreboard.totalScore,
      },
    });

    if (dto.responseData.dealScoreboard.breakdown.length > 0) {
      await this.prisma.scoreBreakdown.createMany({
        data: dto.responseData.dealScoreboard.breakdown.map((item: any) => ({
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
      message: 'Turnkey Property saved successfully',
      data: property,
    };
  }

  async saveSection8Property(userId: string, dto: Section8RequestDto) {
    const property = await this.prisma.propertyCalculation.create({
      data: {
        strategy: 'SECTION_8',
        name: dto.name,
        stateAddress: dto.stateAddress,
        purchasePrice: dto.purchasePrice,
        downPayment: dto.downPayment,
        annualInsurance: dto.annualInsurance,
        annualPropertyTax: dto.annualPropertyTax,
        vacancyRate: dto.vacancyRate,
        maintenanceRate: dto.maintenanceRate,
        managementRate: dto.managementRate,
        capexRate: dto.capexRate,
        userId: userId,
        dscr: dto.responseData.KeyMetrics.DSCR,
        netOperatingIncome: dto.responseData.KeyMetrics.netOperatingIncome,
        monthlyNetCashFlow: dto.responseData.KeyMetrics.monthlyCashFlow,
        scoreBoardStatus: dto.responseData.dealScoreboard.rating,
        totalScore: dto.responseData.dealScoreboard.totalScore,
      },
    });

    if (dto.responseData.dealScoreboard.breakdown.length > 0) {
      await this.prisma.scoreBreakdown.createMany({
        data: dto.responseData.dealScoreboard.breakdown.map((item: any) => ({
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
      data: property,
    };
  }
}
