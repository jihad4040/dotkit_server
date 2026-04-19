import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create.property.dto';
import { PropertyCalculationResponseDto } from './dto/save.property.data.to.database';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) { }

  @Post('calculate-brrrr')
  async analyze(@Body() dto: CreatePropertyDto) {
    return this.propertyService.calculateBrrrr(dto);
  }

  @Post(`calculate-turnkey`)
  async calculateTurnkeyFull(@Body() dto: CreatePropertyDto) {
    return this.propertyService.generateTurnkeyReport(dto);
  }
  @Post(`calculate-Section8_DSCR`)
  async generateSection8_DSCR(@Body() dto: CreatePropertyDto) {
    return this.propertyService.generateSection8_DSCR(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Save property calculation data to the database for the authenticated user' })
  @Post('save')
  async saveDataToDatabase(@GetCurrentUser('userId') userId: string, @Body() dto: PropertyCalculationResponseDto) {
    return this.propertyService.saveDataToDatabase(userId, dto);
  };


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all property calculations for the authenticated user with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Number of items per page for pagination' })
  @Get('user-calculations')
  async getAllCalculationsForUser(
    @GetCurrentUser('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.propertyService.getAllCalculationsForUser(userId, page, limit);
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a specific property calculation by its ID' })
  @Get(':propertyId')
  getCalculationById(@Query('propertyId') propertyId: string) {
    return this.propertyService.getCalculationById(propertyId);
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a specific property calculation by its ID' })
  @Delete('delete/:propertyId')
  deleteCalculationById(@GetCurrentUser('userId') userId: string, @Param('propertyId') propertyId: string) {
    return this.propertyService.deleteCalculationById(propertyId, userId);
  }
}

