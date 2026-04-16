import { nanoid } from 'nanoid';
import type { TaxonomyNode } from '../types';

interface DefaultGroup {
  label: string;
  children: string[];
}

const DEFAULT_GROUPS: DefaultGroup[] = [
  {
    label: 'Property & Unit Management',
    children: ['Property List', 'Unit Details', 'Floorplans', 'Amenities', 'Property Media'],
  },
  {
    label: 'Leasing',
    children: [
      'Lease Templates',
      'Lease Creation',
      'Lease Renewal',
      'Lease Signing',
      'Rent Roll',
      'Move-In Workflow',
      'Move-Out Workflow',
      'Vacancy Tracking',
      'Applicant Screening',
    ],
  },
  {
    label: 'Tenant Management',
    children: ['Tenant Directory', 'Tenant Portal', 'Communication', 'Document Storage'],
  },
  {
    label: 'Rent & Payments',
    children: ['Payment Collection', 'Payment History', 'Late Fees', 'Payment Methods', 'Recurring Charges'],
  },
  {
    label: 'Accounting',
    children: [
      'Chart of Accounts',
      'General Ledger',
      'Bank Reconciliation',
      'Budgets',
      'Invoices',
      'Expense Tracking',
      'Financial Reports',
    ],
  },
  {
    label: 'Maintenance',
    children: ['Work Orders', 'Vendor Management', 'Inspections', 'Preventive Maintenance', 'Parts & Inventory'],
  },
  {
    label: 'Reporting & Analytics',
    children: ['Occupancy Reports', 'Financial Dashboards', 'Delinquency Reports', 'Custom Reports', 'Data Export'],
  },
  {
    label: 'Owner Portal',
    children: ['Owner Statements', 'Owner Documents', 'Owner Dashboard'],
  },
  {
    label: 'Settings & Administration',
    children: ['User Management', 'Roles & Permissions', 'Company Settings'],
  },
  {
    label: 'Platform & UX',
    children: ['Navigation', 'Search', 'Notifications', 'Mobile Experience', 'Onboarding'],
  },
];

export function buildDefaultTaxonomy(): TaxonomyNode[] {
  return DEFAULT_GROUPS.map((group) => ({
    id: nanoid(),
    label: group.label,
    children: group.children.map((child) => ({
      id: nanoid(),
      label: child,
      children: [],
    })),
  }));
}
