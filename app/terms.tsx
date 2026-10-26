import { LegalPage } from '@/components/account/legal-page';

const sections = [
  {
    title: 'What Lancer is',
    body: 'Lancer helps solo professionals see money coming in and going out across their banks, keep receipts, and export statements.',
  },
  {
    title: 'What Lancer is not',
    body: 'Lancer is a record-keeping tool. It does not hold or move money and does not give financial, legal or tax advice.',
  },
  {
    title: 'Account responsibilities',
    body: 'You are responsible for keeping your login secure, reviewing imported data, and checking that your receipts, categories, and trip labels are accurate before filing.',
  },
  {
    title: 'Plans and access',
    body: 'Paid access, trial windows, and feature availability can change over time. If a free trial ends and billing is not active, access can be limited until a plan is activated.',
  },
] as const;

export default function TermsScreen() {
  return <LegalPage intro="Clear expectations for using Lancer." sections={sections} />;
}
