import { ApplicationKind, BankCategory, Prisma } from '@prisma/client';

import { DocumentSlot } from '../documents/enums/document-slot.enum';
import { ComplianceCheckStatus } from './enums/compliance-check-status.enum';
import {
  ComplianceChecklistEvidence,
  ComplianceChecklistItem,
  ComplianceChecklistResponse,
  ComplianceChecklistSection,
  ComplianceChecklistSummary,
} from './interfaces/compliance-checklist.interface';
import { meetsMinimumPaidUpCapital, requiredPaidUpCapitalRwf } from './capital-requirements';

export interface ComplianceApplicationInput {
  id: string;
  referenceNumber: string;
  applicationKind: ApplicationKind;
  bankCategory: BankCategory;
  paidUpCapitalRwf: Prisma.Decimal | string | number;
  country: string;
}

export interface ComplianceDocumentInput {
  id: string;
  slot: string;
  version: number;
}

interface DocumentRequirement {
  slot: DocumentSlot;
  title: string;
  description: string;
  regulatoryBasis: string;
}

const articleFour = 'Regulation 2310/2018-00013, Article 4';
const articleFive = 'Regulation 2310/2018-00013, Article 5';
const articleSixToEight = 'Regulation 2310/2018-00013, Articles 6-8';
const articleNine = 'Regulation 2310/2018-00013, Article 9';
const articleTen = 'Regulation 2310/2018-00013, Article 10';
const articleEleven = 'Regulation 2310/2018-00013, Article 11';
const articleTwelve = 'Regulation 2310/2018-00013, Article 12';

const baseDocumentRequirements: DocumentRequirement[] = [
  {
    slot: DocumentSlot.ApplicantInformationSheet,
    title: 'Applicant information sheet',
    description: 'Applicant, corporate shareholder, subsidiary, and affiliate information sheet.',
    regulatoryBasis: `${articleEleven}(1)`,
  },
  {
    slot: DocumentSlot.ShareholderInformationSheet,
    title: 'Significant shareholder information',
    description: 'Ownership and significant shareholder information for transparency review.',
    regulatoryBasis: `${articleFive}; ${articleEleven}(1)`,
  },
  {
    slot: DocumentSlot.PersonalDeclaration,
    title: 'Personal declarations',
    description:
      'Declarations for significant natural-person shareholders, directors, and managers.',
    regulatoryBasis: `${articleFive}; ${articleEleven}(2)`,
  },
  {
    slot: DocumentSlot.CreditReport,
    title: 'Credit reports',
    description:
      'Credit reports for the applicant, significant shareholders, directors, and managers.',
    regulatoryBasis: `${articleEleven}(3)`,
  },
  {
    slot: DocumentSlot.CapitalStructure,
    title: 'Capital structure',
    description: 'Proposed capital structure and disclosed initial funding sources.',
    regulatoryBasis: `${articleFive}; ${articleEleven}(4)`,
  },
  {
    slot: DocumentSlot.BusinessPlan,
    title: 'Business plan',
    description:
      'Business plan covering market analysis, products, channels, risks, projections, and controls.',
    regulatoryBasis: `${articleSixToEight}; ${articleEleven}(5)`,
  },
  {
    slot: DocumentSlot.IncorporationCertificate,
    title: 'Incorporation and constitutional documents',
    description:
      'Certificate of incorporation, memorandum, articles, statutes, or cooperative rules.',
    regulatoryBasis: `${articleEleven}(6)`,
  },
  {
    slot: DocumentSlot.FinancialStatements,
    title: 'Audited financial statements',
    description: 'Audited financial statements for existing institutions or operating companies.',
    regulatoryBasis: `${articleEleven}(7)`,
  },
  {
    slot: DocumentSlot.BoardResolution,
    title: 'Board or shareholder resolution',
    description: 'Certified resolution authorising preparation and submission of the application.',
    regulatoryBasis: `${articleEleven}(8)`,
  },
  {
    slot: DocumentSlot.ApplicationFeeProof,
    title: 'Application fee proof',
    description: 'Proof of payment of the non-refundable application fee.',
    regulatoryBasis: `${articleTen}; ${articleEleven}(9)`,
  },
  {
    slot: DocumentSlot.FitAndProperForm,
    title: 'Fit and proper evidence',
    description:
      'Evidence that senior managers, directors, and significant shareholders meet fit and proper expectations.',
    regulatoryBasis: `${articleFive}; ${articleSixToEight}`,
  },
];

const foreignDocumentRequirements: DocumentRequirement[] = [
  {
    slot: DocumentSlot.HomeSupervisorNoObjection,
    title: 'Home supervisor no-objection',
    description: 'No-objection letter recommending the foreign bank subsidiary application.',
    regulatoryBasis: `${articleNine}; ${articleTwelve}(1)`,
  },
  {
    slot: DocumentSlot.HomeSupervisorConsolidatedSupervision,
    title: 'Consolidated supervision confirmation',
    description: 'Confirmation that the home supervisor undertakes consolidated supervision.',
    regulatoryBasis: `${articleNine}; ${articleTwelve}(2)`,
  },
  {
    slot: DocumentSlot.HomeSupervisorMouConfirmation,
    title: 'Supervisory cooperation statement',
    description:
      'Statement that the home supervisor is willing to enter into information-sharing and crisis-management arrangements.',
    regulatoryBasis: `${articleNine}; ${articleTwelve}(3)`,
  },
];

export const buildComplianceChecklist = (
  application: ComplianceApplicationInput,
  documents: ComplianceDocumentInput[],
): ComplianceChecklistResponse => {
  const requiredCapital = requiredPaidUpCapitalRwf(application.bankCategory);
  const paidUpCapital = Number(application.paidUpCapitalRwf.toString());
  const foreignApplicant = application.applicationKind === ApplicationKind.FOREIGN_SUBSIDIARY;
  const sections: ComplianceChecklistSection[] = [
    {
      id: 'capital',
      title: 'Capital and licence category',
      items: [
        {
          id: 'minimum-paid-up-capital',
          title: 'Minimum paid-up capital',
          description: `${application.bankCategory} requires at least RWF ${requiredCapital.toLocaleString('en-US')}.`,
          status: meetsMinimumPaidUpCapital(application.bankCategory, paidUpCapital)
            ? ComplianceCheckStatus.Complete
            : ComplianceCheckStatus.Missing,
          blocking: true,
          regulatoryBasis: articleFour,
          requiredSlots: [],
          evidence: [],
        },
      ],
    },
    {
      id: 'supporting-documents',
      title: 'Supporting documents',
      items: baseDocumentRequirements.map((requirement) =>
        documentRequirementItem(requirement, documents, true),
      ),
    },
    {
      id: 'foreign-bank-supervision',
      title: 'Foreign bank supervision',
      items: foreignApplicant
        ? foreignDocumentRequirements.map((requirement) =>
            documentRequirementItem(requirement, documents, true),
          )
        : [
            {
              id: 'foreign-bank-supervision-not-applicable',
              title: 'Foreign bank subsidiary evidence',
              description:
                'Home supervisor evidence is not required for a Rwanda-domiciled applicant.',
              status: ComplianceCheckStatus.NotApplicable,
              blocking: false,
              regulatoryBasis: `${articleNine}; ${articleTwelve}`,
              requiredSlots: [],
              evidence: [],
            },
          ],
    },
    {
      id: 'review-considerations',
      title: 'Review considerations',
      items: [
        {
          id: 'ownership-transparency-review',
          title: 'Ownership transparency review',
          description:
            'Reviewer must assess significant direct and indirect ownership, source of funds, and affiliations.',
          status: ComplianceCheckStatus.ReviewRequired,
          blocking: false,
          regulatoryBasis: articleFive,
          requiredSlots: [DocumentSlot.ShareholderInformationSheet],
          evidence: evidenceFor(DocumentSlot.ShareholderInformationSheet, documents),
        },
        {
          id: 'strategy-and-supervision-review',
          title: 'Business model and supervision review',
          description:
            'Reviewer must assess strategy, viability, risk management, innovation, and supervision concerns.',
          status: ComplianceCheckStatus.ReviewRequired,
          blocking: false,
          regulatoryBasis: `${articleSixToEight}; ${articleNine}`,
          requiredSlots: [DocumentSlot.BusinessPlan],
          evidence: evidenceFor(DocumentSlot.BusinessPlan, documents),
        },
      ],
    },
  ];

  return {
    applicationId: application.id,
    referenceNumber: application.referenceNumber,
    bankCategory: application.bankCategory,
    paidUpCapitalRwf: application.paidUpCapitalRwf.toString(),
    requiredPaidUpCapitalRwf: requiredCapital,
    summary: summarize(sections),
    sections,
  };
};

const documentRequirementItem = (
  requirement: DocumentRequirement,
  documents: ComplianceDocumentInput[],
  blocking: boolean,
): ComplianceChecklistItem => {
  const evidence = evidenceFor(requirement.slot, documents);

  return {
    id: requirement.slot.toLowerCase().replaceAll('_', '-'),
    title: requirement.title,
    description: requirement.description,
    status: evidence.length > 0 ? ComplianceCheckStatus.Complete : ComplianceCheckStatus.Missing,
    blocking,
    regulatoryBasis: requirement.regulatoryBasis,
    requiredSlots: [requirement.slot],
    evidence,
  };
};

const evidenceFor = (
  slot: DocumentSlot,
  documents: ComplianceDocumentInput[],
): ComplianceChecklistEvidence[] => {
  const matchingDocuments = documents
    .filter((document) => document.slot === slot)
    .sort((left, right) => right.version - left.version);

  if (matchingDocuments.length === 0) {
    return [];
  }

  return [
    {
      slot,
      documentIds: matchingDocuments.map((document) => document.id),
      versions: matchingDocuments.map((document) => document.version),
    },
  ];
};

const summarize = (sections: ComplianceChecklistSection[]): ComplianceChecklistSummary => {
  const items = sections.flatMap((section) => section.items);

  return {
    complete: items.filter((item) => item.status === ComplianceCheckStatus.Complete).length,
    missing: items.filter((item) => item.status === ComplianceCheckStatus.Missing).length,
    reviewRequired: items.filter((item) => item.status === ComplianceCheckStatus.ReviewRequired)
      .length,
    notApplicable: items.filter((item) => item.status === ComplianceCheckStatus.NotApplicable)
      .length,
    blockingMissing: items.filter(
      (item) => item.blocking && item.status === ComplianceCheckStatus.Missing,
    ).length,
  };
};
