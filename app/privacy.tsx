import { LegalPage } from '@/components/account/legal-page';
import { appInfo } from '@/lib/app-info';

const sections = [
  {
    title: 'What we collect',
    body: 'Your Google account name, email address and profile photo when you sign in. What you tell Lancer during setup: what you do and your currency. The money records you keep: amounts, money in or out, categories, bank names, dates and times, the other party, your notes and any receipt photos you add.',
  },
  {
    title: 'Bank alerts on Android',
    body: 'If you turn on bank alerts, Android lets Lancer see notifications on your phone. Lancer checks them on your phone for money moving: an amount from a bank app or a bank text message. Chat apps such as WhatsApp and Telegram are ignored, and every other notification is discarded straight away without being stored. For each bank alert, Lancer keeps the amount, the bank, the time and who it was to or from, and asks you what it was for. Only when you answer is that transaction saved to your account; the original alert text stays on your phone. A short list of the last few money notifications is kept on the phone so you can see what Lancer caught. You can turn this off at any time in Android settings under Notification access.',
  },
  {
    title: 'Alerts on iPhone and pasted alerts',
    body: 'On iPhone, Lancer only sees a bank message if you pass it to Lancer yourself, by a Shortcut you set up or by pasting it. The message is read on your phone in the same way as above.',
  },
  {
    title: 'How we use it',
    body: 'To run your account: showing money in and out by bank and category, sending the weekly check-in reminder if you allow notifications, making the exports you ask for, and answering support requests. We do not sell your data, use it for advertising, or share it with anyone except the services below.',
  },
  {
    title: 'Services we rely on',
    body: 'Supabase stores your account and records. Google handles sign-in. If you scan a receipt, the photo is sent to Mindee to read the amount, vendor and date. Payments are handled by Google Play, the App Store or Stripe; Lancer never sees or stores your full card number. Each of these only receives what it needs to do its job.',
  },
  {
    title: 'Security',
    body: 'Data is encrypted in transit, and each account can only read its own records. Lancer never asks for your bank login, PIN or password, and it cannot move money.',
  },
  {
    title: 'Keeping and deleting',
    body: 'We keep your records while your account is open. Account → Delete account removes your profile, transactions, receipts and photos from our servers. Alerts and settings kept only on your phone are removed when you uninstall Lancer.',
  },
  {
    title: 'Children',
    body: 'Lancer is not meant for anyone under 16.',
  },
  {
    title: 'Changes and contact',
    body: `If this policy changes in a way that matters, we will tell you in the app. Questions: ${appInfo.supportEmail}.`,
  },
] as const;

export default function PrivacyScreen() {
  return (
    <LegalPage
      intro="Lancer reads only what it needs to show your money in and out, and keeps your records to your account."
      sections={sections}
    />
  );
}
