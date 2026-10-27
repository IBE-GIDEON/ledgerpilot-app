import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/** The banks and wallets someone said they use during setup, offered first when adding money in or out. */

const KEY = '@lancer/my-banks';

let banks: string[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function load() {
  if (loaded) return;
  loaded = true;
  AsyncStorage.getItem(KEY)
    .then((saved) => {
      banks = saved ? (JSON.parse(saved) as string[]) : [];
      emit();
    })
    .catch(() => undefined);
}

export async function saveMyBanks(next: string[]) {
  banks = [...new Set(next.map((bank) => bank.trim()).filter(Boolean))];
  loaded = true;
  emit();
  await AsyncStorage.setItem(KEY, JSON.stringify(banks)).catch(() => undefined);
}

export function useMyBanks() {
  load();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => banks
  );
}

/** Suggestions for the setup question, by the currency picked. */
export function suggestedBanks(currency: string) {
  switch (currency) {
    case 'NGN':
      return ['OPay', 'Kuda', 'PalmPay', 'Moniepoint', 'GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Wema Bank'];
    case 'GHS':
      return ['MTN MoMo', 'GCB Bank', 'Ecobank', 'Stanbic', 'Fidelity Bank', 'Absa'];
    case 'KES':
      return ['M-Pesa', 'Equity Bank', 'KCB', 'Co-op Bank', 'NCBA', 'Absa'];
    case 'GBP':
      return ['Monzo', 'Revolut', 'Barclays', 'HSBC', 'Lloyds', 'Starling'];
    default:
      return ['PayPal', 'Wise', 'Revolut', 'Chase', 'Bank of America', 'Cash App'];
  }
}
