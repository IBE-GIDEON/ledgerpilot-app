import AsyncStorage from '@react-native-async-storage/async-storage';

/** What the welcome screen needs to offer a one-tap sign-in. Nothing secret is stored. */
export type RecentAccount = {
  email: string;
  name: string;
  avatarUrl: string | null;
  lastUsedAt: string;
};

const KEY = '@lancer/recent-accounts';
const LIMIT = 3;

export async function loadRecentAccounts(): Promise<RecentAccount[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentAccount[]) : [];
  } catch {
    return [];
  }
}

async function save(accounts: RecentAccount[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(accounts));
}

/** Moves the account to the top of the list, keeping the newest few. */
export async function rememberAccount(account: Omit<RecentAccount, 'lastUsedAt'>) {
  const email = account.email.trim().toLowerCase();
  if (!email) {
    return;
  }

  const others = (await loadRecentAccounts()).filter((item) => item.email !== email);
  await save([{ ...account, email, lastUsedAt: new Date().toISOString() }, ...others].slice(0, LIMIT));
}

export async function forgetAccount(email: string) {
  const target = email.trim().toLowerCase();
  await save((await loadRecentAccounts()).filter((item) => item.email !== target));
}
