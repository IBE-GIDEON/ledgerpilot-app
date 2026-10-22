/* eslint-disable import/no-unresolved */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as mindee from 'npm:mindee@5.1.1';
import { Buffer } from 'node:buffer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? '';
const mindeeApiKey = Deno.env.get('MINDEE_API_KEY') ?? '';
const mindeeModelId =
  Deno.env.get('MINDEE_RECEIPT_MODEL_ID') ?? Deno.env.get('MINDEE_MODEL_ID') ?? '';

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
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY for receipt OCR.');
  }

  if (!mindeeApiKey || !mindeeModelId) {
    throw new Error('Mindee receipt OCR is not configured yet.');
  }
}

function asStringField(field: any) {
  return typeof field?.value === 'string' && field.value.trim().length > 0 ? field.value.trim() : null;
}

function asNumberField(field: any) {
  if (typeof field?.value === 'number' && Number.isFinite(field.value)) {
    return field.value;
  }

  return null;
}

function asObjectSubfield(field: any, key: string) {
  return asStringField(field?.fields?.[key]);
}

function mapPurchaseCategory(value: string | null) {
  switch (value) {
    case 'food':
      return 'Meals';
    case 'gasoline':
    case 'parking':
    case 'toll':
      return 'Car';
    case 'accommodation':
    case 'transport':
      return 'Travel';
    case 'telecom':
    case 'software':
      return 'Software';
    case 'shopping':
      return 'Equipment';
    case 'energy':
      return 'Office';
    default:
      return 'Uncategorized';
  }
}

async function runReceiptInference(fileBytes: Uint8Array, filename: string) {
  const client = new mindee.Client({ apiKey: mindeeApiKey });
  const inputSource = new mindee.BytesInput({
    inputBytes: Buffer.from(fileBytes),
    filename,
  });

  const response = await client.enqueueAndGetResult(mindee.product.Extraction, inputSource, {
    modelId: mindeeModelId,
  });

  const fields = response?.inference?.result?.fields ?? {};
  const vendor = asStringField(fields.supplier_name);
  const amount = asNumberField(fields.total_amount);
  const purchaseCategory = asStringField(fields.purchase_category);
  const currencyCode = asObjectSubfield(fields.locale, 'currency');
  const issuedDate = asStringField(fields.date);
  const receiptNumber = asStringField(fields.receipt_number);

  return {
    amount,
    category: mapPurchaseCategory(purchaseCategory),
    confidence: null,
    currencyCode,
    date: issuedDate,
    note: receiptNumber
      ? `Drafted from receipt photo | Ref ${receiptNumber}`
      : 'Drafted from receipt photo',
    vendor,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    ensureRequiredEnvironment();

    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const {
      data: { user },
      error: userError,
    } = await userSupabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { storagePath } = await req.json();

    if (typeof storagePath !== 'string' || storagePath.trim().length === 0) {
      throw new Error('Missing storagePath');
    }

    if (!storagePath.startsWith(`${user.id}/`)) {
      throw new Error('Receipt file does not belong to this user.');
    }

    const { data: fileData, error: downloadError } = await adminSupabase.storage
      .from('receipts')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? 'Unable to load receipt image.');
    }

    const filename = storagePath.split('/').pop() ?? 'receipt.jpg';
    const fileBytes = new Uint8Array(await fileData.arrayBuffer());
    const draft = await runReceiptInference(fileBytes, filename);

    return jsonResponse({
      ...draft,
      storagePath,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown receipt OCR error' },
      400
    );
  }
});
