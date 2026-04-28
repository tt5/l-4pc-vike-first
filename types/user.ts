export interface User {
  id: string;
  username: string;
  role?: 'admin' | 'user';
  token: string;
}

export type NullableUser = User | null;
