import { ApplicationKind } from '@prisma/client';

export const APPLICATION_FEE_RWF: Record<ApplicationKind, number> = {
  [ApplicationKind.NEW_BANK]: 2000000,
  [ApplicationKind.FOREIGN_SUBSIDIARY]: 2000000,
  [ApplicationKind.REPRESENTATIVE_OFFICE]: 500000,
};

export const applicationFeeRwf = (applicationKind: ApplicationKind): number =>
  APPLICATION_FEE_RWF[applicationKind];
