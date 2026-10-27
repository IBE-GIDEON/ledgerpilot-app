import { createContext, useContext } from 'react';

/** The currency amounts are shown in. Reading it makes a component redraw the moment it changes, even inside memo or a list. */
export const DisplayCurrencyContext = createContext('USD');

export function useDisplayCurrency() {
  return useContext(DisplayCurrencyContext);
}
