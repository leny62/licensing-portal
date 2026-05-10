import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class JustificationDto {
  @IsString()
  justification!: string;
}

export class AssignReviewerDto {
  @IsUUID()
  reviewerId!: string;
}

export class RecommendationDto {
  @IsIn(['APPROVE', 'REJECT'])
  recommendation!: 'APPROVE' | 'REJECT';

  @IsString()
  justification!: string;
}

export class DecisionDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsString()
  justification!: string;
}

export class ListApplicationsQueryDto {
  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  reviewerId?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
