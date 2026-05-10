import { UserRole } from '@prisma/client';

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  institutionName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
