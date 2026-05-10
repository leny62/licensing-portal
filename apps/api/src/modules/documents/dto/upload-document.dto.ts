import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { DocumentSlot } from '../enums/document-slot.enum';

export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentSlot,
    example: DocumentSlot.BusinessPlan,
  })
  @IsEnum(DocumentSlot)
  slot!: DocumentSlot;
}
