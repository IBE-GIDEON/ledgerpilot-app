/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as plaid from 'https://esm.sh/plaid@12.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? '';

const plaidEnv = Deno.env.get('PLAID_ENV') || 'sandbox';
const plaidCountryCodes = (Deno.env.get('PLAID_COUNTRY_CODES') ?? 'US')
  .split(',')
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean) as plaid.CountryCode[];

const configuration = new plaid.Configuration({
  basePath: plaid.PlaidEnvironments[plaidEnv],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': Deno.env.get('PLAID-CLIENT-ID') ?? Deno.env.get('PLAID_CLIENT_ID'),
      'PLAID-SECRET': Deno.env.get('PLAID-SECRET') ?? Deno.env.get('PLAID_SECRET'),
    },
  },
});

const plaidClient = new plaid.PlaidApi(configuration);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function ensureRequiredEnvironment() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment is missing.');
  }

  if (!supabaseServiceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for secure bank sync.');
  }
}

function getInstitutionName(metadata: Record<string, any> | null | undefined) {
  return metadata?.institution?.name ?? 'Linked institution';
}

function getPlaidErrorCode(error: any) {
  return error?.response?.data?.error_code ?? error?.error_code ?? error?.code ?? null;
}

function getPlaidErrorMessage(error: any) {
  return (
    error?.response?.data?.error_message ??
    error?.response?.data?.display_message ??
    error?.message ??
    'Unknown Plaid error'
  );
}

function normalizeOccurredAt(transaction: any) {
  const preferred =
    transaction.authorized_datetime ??
    transaction.datetime ??
    transaction.authorized_date ??
    transaction.date;

  if (!preferred) {
    return new Date().toISOString();
  }

  if (typeof preferred === 'string' && preferred.includes('T')) {
    return new Date(preferred).toISOString();
  }

  return new Date(`${preferred}T12:00:00.000Z`).toISOString();
}

function mapCategory(transaction: any) {
  const primary = transaction.personal_finance_category?.primary ?? '';

  if (primary.includes('INCOME')) return 'Client payment';
  if (primary.includes('TRANSPORTATION')) return 'Transport';
  if (primary.includes('TRAVEL')) return 'Travel';
  if (primary.includes('FOOD_AND_DRINK')) return 'Meals';
  if (primary.includes('GENERAL_MERCHANDISE')) return 'Equipment';
  if (primary.includes('GENERAL_SERVICES')) return 'Software';
  if (primary.includes('BANK_FEES')) return 'Misc';
  if (primary.includes('RENT_AND_UTILITIES')) return 'Office';
  if (primary.includes('LOAN_PAYMENTS')) return 'Misc';

  return transaction.amount < 0 ? 'Freelance' : 'Misc';
}

function isLikelyDeductible(transaction: any, category: string) {
  if (transaction.amount < 0) {
    return false;
  }

  const primary = transaction.personal_finance_category?.primary ?? '';
  const merchant = `${transaction.merchant_name ?? ''} ${transaction.name ?? ''}`.toLowerCase();

  if (
    primary.includes('TRANSPORTATION') ||
    primary.includes('TRAVEL') ||
    primary.includes('GENERAL_SERVICES') ||
    primary.includes('GENERAL_MERCHANDISE') ||
    primary.includes('BANK_FEES') ||
    primary.includes('RENT_AND_UTILITIES')
  ) {
    return true;
  }

  return ['transport', 'travel', 'meals', 'software', 'equipment', 'office'].includes(
    category.toLowerCase()
  )
    ? true
    : /(uber|lyft|google|apple|adobe|figma|notion|zoom|slack|fuel|shell|chevron|bp)/.test(merchant);
}

async function syncPlaidAccounts(params: {
  accessToken: string;
  adminSupabase: ReturnType<typeof createClient>;
  connectionId: string;
  institutionName: string;
  userId: string;
}) {
  const { accessToken, adminSupabase, connectionId, institutionName, userId } = params;
  const syncedAt = new Date().toISOString();

  const accountsResponse = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  const plaidAccounts = accountsResponse.data.accounts;

  const bankAccountRows = plaidAccounts.map((account) => ({
    connection_id: connectionId,
    user_id: userId,
    plaid_account_id: account.account_id,
    name: account.name,
    official_name: account.official_name,
    mask: account.mask,
    type: account.type,
    subtype: account.subtype,
    current_balance: account.balances.current,
    available_balance: account.balances.available,
    limit_balance: account.balances.limit,
    iso_currency_code: account.balances.iso_currency_code || 'USD',
    unofficial_currency_code: account.balances.unofficial_currency_code,
    is_active: true,
  }));

  const { data: storedAccounts, error: accountsError } = await adminSupabase
    .from('bank_accounts')
    .upsert(bankAccountRows, { onConflict: 'plaid_account_id' })
    .select(
      'id, plaid_account_id, name, official_name, mask, type, subtype, current_balance, available_balance, iso_currency_code'
    );

  if (accountsError) {
    throw accountsError;
  }

  const connectedAccountRows = plaidAccounts.map((account) => ({
    user_id: userId,
    provider: 'plaid',
    institution_name: institutionName,
    external_account_id: account.account_id,
    status: 'active',
    read_only: true,
    last_synced_at: syncedAt,
  }));

  const { data: connectedAccounts, error: connectedAccountsError } = await adminSupabase
    .from('connected_accounts')
    .upsert(connectedAccountRows, { onConflict: 'provider,external_account_id' })
    .select('id, external_account_id');

  if (connectedAccountsError) {
    throw connectedAccountsError;
  }

  const connectedAccountMap = new Map<string, string>();

  for (const row of connectedAccounts ?? []) {
    connectedAccountMap.set(row.external_account_id, row.id);
  }

  return {
    connectedAccountMap,
    accounts: (storedAccounts ?? []).map((account) => ({
      id: account.id,
      name: account.name,
      official_name: account.official_name,
      mask: account.mask,
      type: account.type,
      subtype: account.subtype,
      current_balance: account.current_balance,
      available_balance: account.available_balance,
      iso_currency_code: account.iso_currency_code,
    })),
  };
}

async function syncPlaidTransactions(params: {
  accessToken: string;
  adminSupabase: ReturnType<typeof createClient>;
  connectedAccountMap: Map<string, string>;
  connection: Record<string, any>;
  institutionName: string;
  userId: string;
}) {
  const { accessToken, adminSupabase, connectedAccountMap, connection, institutionName, userId } =
    params;

  let hasMore = true;
  let cursor = connection.transactions_cursor ?? undefined;
  const added: any[] = [];
  const modified: any[] = [];
  const removed: any[] = [];

  try {
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 100,
      });

      added.push(...response.data.added);
      modified.push(...response.data.modified);
      removed.push(...response.data.removed);
      hasMore = response.data.has_more;
      cursor = response.data.next_cursor;
    }
  } catch (error) {
    const errorCode = getPlaidErrorCode(error);

    if (errorCode === 'PRODUCT_NOT_READY') {
      return {
        productReady: false,
        transactionsImported: 0,
        removedTransactions: 0,
        nextCursor: connection.transactions_cursor ?? null,
      };
    }

    throw new Error(getPlaidErrorMessage(error));
  }

  const transactionRows = [...added, ...modified].map((transaction) => {
    const amount = Number(transaction.amount ?? 0);
    const kind = amount < 0 ? 'income' : 'expense';
    const category = mapCategory(transaction);
    const merchant = transaction.merchant_name ?? transaction.name ?? 'Bank transaction';

    return {
      user_id: userId,
      connected_account_id: connectedAccountMap.get(transaction.account_id) ?? null,
      external_id: transaction.transaction_id,
      merchant,
      amount: kind === 'income' ? Math.abs(amount) : -Math.abs(amount),
      currency_code:
        transaction.iso_currency_code ?? transaction.unofficial_currency_code ?? 'USD',
      kind,
      category,
      deductible: isLikelyDeductible(transaction, category),
      source: `${institutionName} sync`,
      sync_status: 'bank_sync',
      note: transaction.pending ? 'Pending bank transaction' : '',
      occurred_at: normalizeOccurredAt(transaction),
    };
  });

  if (transactionRows.length > 0) {
    const { error: upsertError } = await adminSupabase
      .from('transactions')
      .upsert(transactionRows, { onConflict: 'user_id,external_id' });

    if (upsertError) {
      throw upsertError;
    }
  }

  if (removed.length > 0) {
    const removedIds = removed.map((transaction) => transaction.transaction_id).filter(Boolean);

    if (removedIds.length > 0) {
      const { error: deleteError } = await adminSupabase
        .from('transactions')
        .delete()
        .eq('user_id', userId)
        .in('external_id', removedIds);

      if (deleteError) {
        throw deleteError;
      }
    }
  }

  const lastSyncedAt = new Date().toISOString();
  const { error: connectionUpdateError } = await adminSupabase
    .from('bank_connections')
    .update({
      status: 'active',
      last_synced_at: lastSyncedAt,
      transactions_cursor: cursor ?? connection.transactions_cursor ?? null,
    })
    .eq('id', connection.id);

  if (connectionUpdateError) {
    throw connectionUpdateError;
  }

  return {
    productReady: true,
    transactionsImported: transactionRows.length,
    removedTransactions: removed.length,
    nextCursor: cursor ?? connection.transactions_cursor ?? null,
  };
}

async function listConnections(adminSupabase: ReturnType<typeof createClient>, userId: string) {
  const { data: connections, error: connectionsError } = await adminSupabase
    .from('bank_connections')
    .select('id, institution_name, status, last_synced_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (connectionsError) {
    throw connectionsError;
  }

  const { data: accounts, error: accountsError } = await adminSupabase
    .from('bank_accounts')
    .select(
      'id, connection_id, name, official_name, mask, type, subtype, current_balance, available_balance, iso_currency_code'
    )
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (accountsError) {
    throw accountsError;
  }

  return (connections ?? []).map((connection) => ({
    id: connection.id,
    institution_name: connection.institution_name,
    status: connection.status,
    last_synced_at: connection.last_synced_at,
    product_ready: Boolean(connection.last_synced_at),
    accounts: (accounts ?? [])
      .filter((account) => account.connection_id === connection.id)
      .map((account) => ({
        id: account.id,
        name: account.name,
        official_name: account.official_name,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        current_balance: account.current_balance,
        available_balance: account.available_balance,
        iso_currency_code: account.iso_currency_code,
      })),
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    ensureRequiredEnvironment();

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { action, connection_id: connectionId, metadata, public_token: publicToken } = await req.json();

    if (action === 'create-link-token') {
      const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: user.id },
        client_name: 'LedgerPilot',
        products: ['auth', 'transactions'] as plaid.Products[],
        country_codes: plaidCountryCodes,
        language: 'en',
      });

      return jsonResponse(response.data);
    }

    if (action === 'list-connections') {
      const connections = await listConnections(adminSupabase, user.id);
      return jsonResponse({ connections });
    }

    if (action === 'exchange-public-token') {
      if (!publicToken) {
        throw new Error('Missing public_token');
      }

      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });
      const accessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;
      const institutionName = getInstitutionName(metadata);

      const { data: connection, error: connectionError } = await adminSupabase
        .from('bank_connections')
        .upsert(
          {
            user_id: user.id,
            access_token: accessToken,
            item_id: itemId,
            institution_id: metadata?.institution?.institution_id ?? null,
            institution_name: institutionName,
            status: 'active',
          },
          { onConflict: 'item_id' }
        )
        .select('*')
        .single();

      if (connectionError) {
        throw connectionError;
      }

      const accountSync = await syncPlaidAccounts({
        accessToken,
        adminSupabase,
        connectionId: connection.id,
        institutionName,
        userId: user.id,
      });

      const transactionSync = await syncPlaidTransactions({
        accessToken,
        adminSupabase,
        connectedAccountMap: accountSync.connectedAccountMap,
        connection,
        institutionName,
        userId: user.id,
      });

      return jsonResponse({
        success: true,
        connection_id: connection.id,
        institution_name: institutionName,
        accounts_imported: accountSync.accounts.length,
        transactions_imported: transactionSync.transactionsImported,
        product_ready: transactionSync.productReady,
        accounts: accountSync.accounts,
      });
    }

    if (action === 'refresh-transactions') {
      const connectionQuery = adminSupabase
        .from('bank_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const { data: connections, error: connectionsError } = connectionId
        ? await connectionQuery.eq('id', connectionId)
        : await connectionQuery;

      if (connectionsError) {
        throw connectionsError;
      }

      let transactionsImported = 0;
      let productReadyConnections = 0;

      for (const connection of connections ?? []) {
        try {
          const institutionName = connection.institution_name ?? 'Linked institution';
          const accountSync = await syncPlaidAccounts({
            accessToken: connection.access_token,
            adminSupabase,
            connectionId: connection.id,
            institutionName,
            userId: user.id,
          });

          const transactionSync = await syncPlaidTransactions({
            accessToken: connection.access_token,
            adminSupabase,
            connectedAccountMap: accountSync.connectedAccountMap,
            connection,
            institutionName,
            userId: user.id,
          });

          transactionsImported += transactionSync.transactionsImported;

          if (transactionSync.productReady) {
            productReadyConnections += 1;
          }
        } catch (error) {
          await adminSupabase
            .from('bank_connections')
            .update({ status: 'error' })
            .eq('id', connection.id);
          throw error;
        }
      }

      const sanitizedConnections = await listConnections(adminSupabase, user.id);

      return jsonResponse({
        connections_synced: connections?.length ?? 0,
        transactions_imported: transactionsImported,
        product_ready_connections: productReadyConnections,
        connections: sanitizedConnections,
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});
