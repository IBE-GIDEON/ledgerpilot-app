import { LegalPage } from '@/components/account/legal-page';
import { appInfo } from '@/lib/app-info';

const sections = [
  {
    title: 'What Lancer is',
    body: 'Lancer helps you see money coming in and going out across your banks: by bank, by category, by day and time. You can add transactions yourself, keep receipts, export statements, and on Android let Lancer pick up your bank alerts.',
  },
  {
    title: 'What Lancer is not',
    body: 'Lancer is a record-keeping tool. It is not a bank, does not hold or move money, and does not give financial, legal or tax advice. It is not connected to your bank account and cannot make payments.',
  },
  {
    title: 'Your account',
    body: 'You sign in with Google and must be at least 16. Keep your Google account secure; anything done while signed in to your Lancer account is treated as done by you. You can use more than one Google account and switch between them.',
  },
  {
    title: 'Your records',
    body: 'Your records belong to you. Bank alerts are read automatically and can occasionally be misread, missed or arrive late, for example if a bank changes its wording or your phone stops background apps. Check important figures against your bank statement before relying on them.',
  },
  {
    title: 'Plan and payment',
    body: 'Lancer has one plan: $3 a month, or the equivalent your app store shows in your currency, after a 7-day free trial. It renews monthly until you cancel, which you can do at any time in your Google Play or App Store subscriptions. Cancelling stops the next charge; you keep access until the end of the month already paid. When the trial ends without a plan, paid features such as receipt scanning stop until you subscribe; your records stay yours to see and export.',
  },
  {
    title: 'Fair use',
    body: 'Do not use Lancer to break the law, to track other people’s money without their permission, or to interfere with the service or other accounts.',
  },
  {
    title: 'Ending your account',
    body: 'You can delete your account at any time from Account → Delete account. We may suspend accounts that break these terms.',
  },
  {
    title: 'Availability and liability',
    body: 'We work to keep Lancer running and accurate, but it is provided as it is, without guarantees that it will always be available or error-free. To the extent the law allows, we are not liable for losses that come from relying on figures in the app.',
  },
  {
    title: 'Changes and contact',
    body: `We will tell you in the app before changes to these terms take effect. Questions: ${appInfo.supportEmail}.`,
  },
] as const;

export default function TermsScreen() {
  return <LegalPage intro="The plain rules for using Lancer." sections={sections} />;
}
