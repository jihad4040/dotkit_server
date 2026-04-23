import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PropertyService } from './property.service';
import { CreatePropertyDto } from './dto/create.property.dto';
import { GetCurrentUser } from 'src/common/decorator/get-current-user.decorator';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SaveBrrrPropertyDataDto } from './dto/save.brrrr.property.data.dto';
import { SaveSection8PropertyDataDto } from './dto/save.section8.property.dto';
import { CalculateBrrrPropertyDto } from './dto/calculate.brrrr.property.dto';
import { CalculateTurnkeyPropertyDto } from './dto/calculate.turnkey.property.dto';
import { CreateBrrrrDto } from './dto/create.save.brrr.property.dto';
import { CreateTurnkeyDto } from './dto/create.save.turnkey.dto';
import { CreateSaveSection8Dto } from './dto/create.save.section.8.dto';
import { faltuDto } from './dto/faltu.dto';

@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @Post('calculate-brrrr')
  async analyze(@Body() dto: CalculateBrrrPropertyDto) {
    return this.propertyService.calculateBrrrr(dto);
  }

  @Post(`calculate-turnkey`)
  async calculateTurnkeyFull(@Body() dto: CalculateTurnkeyPropertyDto) {
    return this.propertyService.generateTurnkeyReport(dto);
  }
  @Post(`calculate-Section8_DSCR`)
  async generateSection8_DSCR(@Body() dto: CreatePropertyDto) {
    return this.propertyService.generateSection8_DSCR(dto);
  }

  @ApiBearerAuth()
  @Get('user-calculations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Get all property calculations for the authenticated user with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Number of items per page (default: 10)',
  })
  async getAllCalculationsForUser(
    @GetCurrentUser('userId') userId: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
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
  deleteCalculationById(
    @GetCurrentUser('userId') userId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.propertyService.deleteCalculationById(propertyId, userId);
  }

  @Post(`save-brrr-property`)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async saveBrrrProperty(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: CreateBrrrrDto,
  ) {
    // return this.propertyService.saveBrrrProperty(userId, dto);
    return dto;
  }

  @Post(`save-turnkey-property`)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async saveTurnkeyProperty(
    @GetCurrentUser('userId') userId: string,
    @Body() dto: CreateTurnkeyDto,
  ) {
    // return this.propertyService.saveTurnkeyProperty(userId, dto);
    return dto;
  }

  @Post(`save-section8-property`)
  async saveSection8Property(@Body() dto: faltuDto) {
    // return this.propertyService.saveSection8Property(userId, dto);
    return dto;
  }
  // @Post(`save-section8-property`)
  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // async saveSection8Property(
  //   @GetCurrentUser('userId') userId: string,
  //   @Body() dto: CreateSection8Dto,
  // ) {
  //   // return this.propertyService.saveSection8Property(userId, dto);
  //   return dto;
  // }
}
