import { getSupabaseClient } from './client';

export interface LinkedBankAccount {
  id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  type: string | null;
  subtype: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency_code: string;
}

export interface LinkedBankConnection {
  id: string;
  institution_name: string | null;
  status: string;
  last_synced_at: string | null;
  product_ready: boolean;
  accounts: LinkedBankAccount[];
}

export interface PlaidLinkTokenResponse {
  link_token: string;
  expiration: string;
  request_id: string;
}

export interface PlaidExchangeResponse {
  success: boolean;
  connection_id: string;
  institution_name: string | null;
  accounts_imported: number;
  transactions_imported: number;
  product_ready: boolean;
  accounts: LinkedBankAccount[];
  error?: string;
}

export interface BankConnectionsResponse {
  connections: LinkedBankConnection[];
}

export interface BankRefreshResponse {
  connections_synced: number;
  transactions_imported: number;
  product_ready_connections: number;
  connections: LinkedBankConnection[];
}

async function invokeBankingFunction<T>(body: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.functions.invoke('plaid-bridge', { body });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export const banking = {
  async createLinkToken(): Promise<string> {
    const data = await invokeBankingFunction<PlaidLinkTokenResponse>({
      action: 'create-link-token',
    });

    return data.link_token;
  },

  async exchangePublicToken(
    publicToken: string,
    metadata: unknown
  ): Promise<PlaidExchangeResponse> {
    return invokeBankingFunction<PlaidExchangeResponse>({
      action: 'exchange-public-token',
      public_token: publicToken,
      metadata,
    });
  },

  async listConnections(): Promise<LinkedBankConnection[]> {
    const data = await invokeBankingFunction<BankConnectionsResponse>({
      action: 'list-connections',
    });

    return data.connections;
  },

  async refreshTransactions(connectionId?: string): Promise<BankRefreshResponse> {
    return invokeBankingFunction<BankRefreshResponse>({
      action: 'refresh-transactions',
      connection_id: connectionId,
    });
  },
};
