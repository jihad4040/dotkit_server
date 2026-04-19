import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StrategyType } from "@prisma/client";
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { Type } from 'class-transformer';

export class ScoreBreakdownDto {
    @ApiPropertyOptional({ example: 'Cash Flow' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ example: -3045.66 })
    @IsNumber()
    @IsOptional()
    value?: number;

    @ApiPropertyOptional({ example: 0 })
    @IsNumber()
    @IsOptional()
    score?: number;

    @ApiPropertyOptional({ example: 'BAD' })
    @IsString()
    @IsOptional()
    status?: string;
};
//purchasePrice downPayment annualInsurance annualPropertyTax 
// vacancyRate maintenanceRate managementRate capexRate 
// monthlyCashFlow cashOnCashReturn annualNoi allInCost dscr onePercentRule netOperatingIncome 
// monthlyRent annualRent effectiveIncome 
// totalExpenses noi 
// mortgage 


export class PropertyCalculationResponseDto {

    @ApiProperty({ enum: StrategyType, example: `BRRRR or TURNKEY or SECTION_8` })
    @IsEnum(StrategyType)
    strategy!: StrategyType;

    @ApiProperty({ example: '123 Main St, Los Angeles, CA' })
    @IsString()
    stateAddress!: string;

    // --- KEY METRICS ---
    @ApiProperty({ example: 150000 })
    @IsOptional()
    allInCost?: number;

    @ApiProperty({ example: 30000 })
    @IsNumber()
    @IsOptional()
    initialCashInvested?: number;
    @ApiProperty({ example: -250 })

    @ApiProperty({ example: -250 })
    @IsNumber()
    @IsOptional()
    monthlyCashFlow?: number;

    @ApiProperty({ example: -10.0 })
    @IsNumber()
    @IsOptional()
    cashOnCashReturn?: number;

    @ApiProperty({ example: 8.0 })
    @IsNumber()
    @IsOptional()
    capRate?: number;


    @ApiProperty({ example: 0.69 })
    @IsNumber()
    @IsOptional()
    dscr?: number;


    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    onePercentRule?: boolean;


    @ApiProperty({ example: 917 })
    @IsNumber()
    @IsOptional()
    netOperatingIncome?: number;


    @ApiProperty({ example: 11002 })
    @IsNumber()
    @IsOptional()
    annualNoi?: number;


    @ApiProperty({ example: 1330.6 })
    @IsNumber()
    @IsOptional()
    monthlyMortgage?: number;


    @ApiProperty({ example: -3045.66 })
    @IsNumber()
    @IsOptional()
    annualNetCashFlow?: number;


    @ApiProperty({ example: 1500 })
    @IsNumber()
    @IsOptional()
    monthlyRent?: number;

    @ApiProperty({ example: 18000 })
    @IsNumber()
    @IsOptional()
    annualRent?: number;

    @ApiProperty({ example: 17000 })
    @IsNumber()
    @IsOptional()
    effectiveIncome?: number;


    @ApiProperty({ example: 5000 })
    @IsNumber()
    @IsOptional()
    totalExpenses?: number;


    @ApiProperty({ example: 12000 })
    @IsNumber()
    @IsOptional()
    noi?: number;


    @ApiProperty({ example: 1330.6 })
    @IsNumber()
    @IsOptional()
    mortgage?: number;

    @ApiProperty({ example: 150000 })
    @IsNumber()
    @IsOptional()
    purchasePrice?: number;

    @ApiProperty({ example: 30000 })
    @IsNumber()
    @IsOptional()
    downPayment?: number;

    @ApiProperty({ example: 1200 })
    @IsNumber()
    @IsOptional()
    annualInsurance?: number;

    @ApiProperty({ example: 2000 })
    @IsNumber()
    @IsOptional()
    annualPropertyTax?: number;

    @ApiProperty({ example: 0.05 })
    @IsNumber()
    @IsOptional()
    vacancyRate?: number;

    @ApiProperty({ example: 0.1 })
    @IsNumber()
    @IsOptional()
    maintenanceRate?: number;

    @ApiProperty({ example: 0.08 })
    @IsNumber()
    @IsOptional()
    managementRate?: number;

    @ApiProperty({ example: 0.05 })
    @IsNumber()
    @IsOptional()
    capexRate?: number;

    // --- OPTIONAL SCOREBOARD ---
    @ApiPropertyOptional({ example: 0 })
    @IsNumber()
    @IsOptional()
    totalScore?: number;

    @ApiPropertyOptional({ example: 'BAD DEAL' })
    @IsString()
    @IsOptional()
    scoreBoardStatus?: string;

    // --- RELATIONSHIPS ---
    @ApiPropertyOptional({ type: [ScoreBreakdownDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ScoreBreakdownDto)
    breakdown?: ScoreBreakdownDto[];
}