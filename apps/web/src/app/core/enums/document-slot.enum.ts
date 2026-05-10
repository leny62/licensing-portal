export enum DocumentSlot {
  BusinessPlan = 'BUSINESS_PLAN',
  IncorporationCertificate = 'INCORPORATION_CERTIFICATE',
  FinancialStatements = 'FINANCIAL_STATEMENTS',
  FitAndProperForm = 'FIT_AND_PROPER_FORM',
  Other = 'OTHER',
}

export const DOCUMENT_SLOT_LABELS: Record<DocumentSlot, string> = {
  [DocumentSlot.BusinessPlan]: 'Business Plan',
  [DocumentSlot.IncorporationCertificate]: 'Incorporation Certificate',
  [DocumentSlot.FinancialStatements]: 'Financial Statements',
  [DocumentSlot.FitAndProperForm]: 'Fit & Proper Form',
  [DocumentSlot.Other]: 'Other Document',
};
