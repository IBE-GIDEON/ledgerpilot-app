import { getSupabaseClient } from './client';

export interface ReceiptCaptureAsset {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
}

export interface ReceiptScanResult {
  amount: number | null;
  category: string;
  confidence: number | null;
  currencyCode: string | null;
  date: string | null;
  note: string;
  storagePath: string;
  vendor: string | null;
}

const RECEIPTS_BUCKET = 'receipts';

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function uploadReceiptAsset(asset: ReceiptCaptureAsset): Promise<string> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  if (error || !user) {
    throw new Error('You need to be signed in to upload receipts.');
  }

  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const extension =
    asset.fileName?.split('.').pop()?.toLowerCase() ??
    asset.mimeType?.split('/').pop()?.toLowerCase() ??
    'jpg';
  const safeName = sanitizeFileName(asset.fileName ?? `receipt-${Date.now()}.${extension}`);
  const storagePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, blob, {
      contentType: asset.mimeType ?? 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return storagePath;
}

export async function scanUploadedReceipt(storagePath: string): Promise<ReceiptScanResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.functions.invoke('mindee-receipt', {
    body: {
      storagePath,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as ReceiptScanResult;
}

export async function removeUploadedReceiptAsset(storagePath: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.storage.from(RECEIPTS_BUCKET).remove([storagePath]);
}
