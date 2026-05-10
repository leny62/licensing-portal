import { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface UserResponse extends AuthenticatedUser {
  fullName: string;
  institutionName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  institutionName?: string | null;
}

export interface UpdateUserRequest {
  email?: string;
  fullName?: string;
  role?: UserRole;
  institutionName?: string | null;
}

export interface ListUsersQuery {
  role?: UserRole;
  q?: string;
  page?: number;
  size?: number;
}
