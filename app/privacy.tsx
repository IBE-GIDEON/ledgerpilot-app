import { LegalPage } from '@/components/account/legal-page';

const sections = [
  {
    title: 'What we collect',
    body: 'We collect the account information you give us directly, along with the transactions, receipts, bank names and profile settings you choose to store inside Lancer.',
  },
  {
    title: 'How we use it',
    body: 'We use your data to show your dashboard, organize money in and out by bank and category, generate exports, and improve support for your account.',
  },
  {
    title: 'Bank connections',
    body: 'When you connect a bank, we use read-only providers so we can import data without moving money. Your bank credentials are handled by the connection provider, not stored by Lancer.',
  },
  {
    title: 'Your control',
    body: 'You can update profile data, disconnect linked accounts, export your records, and request account deletion from inside the app.',
  },
] as const;

export default function PrivacyScreen() {
  return <LegalPage intro="Your financial data stays under your control." sections={sections} />;
}
