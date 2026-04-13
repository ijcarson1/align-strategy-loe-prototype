import type { User } from '../types';

export interface DemoCredential {
  email: string;
  password: string;
  user: User;
}

export const DEMO_USERS: DemoCredential[] = [
  {
    email: 'demo@alignstrategy.com',
    password: 'Pharma2026!',
    user: {
      email: 'demo@alignstrategy.com',
      name: 'Sarah Mitchell',
      company: 'Pharma Co.',
      title: 'VP Commercial Strategy',
      role: 'global',
    },
  },
  {
    email: 'nordic@alignstrategy.com',
    password: 'Pharma2026!',
    user: {
      email: 'nordic@alignstrategy.com',
      name: 'Lars Eriksson',
      company: 'Pharma Co. Nordics',
      title: 'Regional Director',
      role: 'regional',
      regionId: 'nordics',
    },
  },
  {
    email: 'uk@alignstrategy.com',
    password: 'Pharma2026!',
    user: {
      email: 'uk@alignstrategy.com',
      name: 'Emma Clarke',
      company: 'Pharma Co. UK',
      title: 'Country Manager',
      role: 'regional',
      regionId: 'uk',
    },
  },
];
