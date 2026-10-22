import { LegalPage } from '@/components/account/legal-page';

const sections = [
  {
    title: 'What Lancer is',
    body: 'Lancer helps solo professionals organize money activity, track receipts and mileage, estimate tax set-asides, and prepare exports for filing support.',
  },
  {
    title: 'What Lancer is not',
    body: 'Lancer does not replace your accountant, lawyer, or tax adviser. Estimates and recommendations are organizational tools unless you are working with a licensed expert separately.',
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
