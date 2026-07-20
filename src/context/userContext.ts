import { createContext } from '@lit/context';
import { User } from 'firebase/auth';

export interface UserProfile {
  company: string;
  created: number;
  displayname: string;
  email: string;
  key: string;
  photoURL: string | null;
  phone: string;
  role: string;
  setup: boolean;
}

export interface UserContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

// Context key for user state
export const userContext = createContext<UserContextValue>('user-context');
