export enum ShareholderType {
  NaturalPerson = 'NATURAL_PERSON',
  LegalEntity = 'LEGAL_ENTITY',
}

export const SHAREHOLDER_TYPE_LABELS: Record<ShareholderType, string> = {
  [ShareholderType.NaturalPerson]: 'Natural person',
  [ShareholderType.LegalEntity]: 'Legal entity',
};
