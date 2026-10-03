export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
};
