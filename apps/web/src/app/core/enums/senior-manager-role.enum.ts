export enum SeniorManagerRole {
  ChiefExecutive = 'CHIEF_EXECUTIVE',
  ChiefFinance = 'CHIEF_FINANCE',
  ChiefRisk = 'CHIEF_RISK',
  ChiefCompliance = 'CHIEF_COMPLIANCE',
  InternalAudit = 'INTERNAL_AUDIT',
  Operations = 'OPERATIONS',
  Other = 'OTHER',
}

export const SENIOR_MANAGER_ROLE_LABELS: Record<SeniorManagerRole, string> = {
  [SeniorManagerRole.ChiefExecutive]: 'Chief executive',
  [SeniorManagerRole.ChiefFinance]: 'Chief finance',
  [SeniorManagerRole.ChiefRisk]: 'Chief risk',
  [SeniorManagerRole.ChiefCompliance]: 'Chief compliance',
  [SeniorManagerRole.InternalAudit]: 'Internal audit',
  [SeniorManagerRole.Operations]: 'Operations',
  [SeniorManagerRole.Other]: 'Other',
};
