import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Field, Screen, Text, useFeature } from '@/components/ds';
import { CaptureSource, pickReceiptImage } from '@/components/money/receipt-capture';
import { parseAmount, uncategorized } from '@/components/money/money-utils';
import { radius, space, tabularNums } from '@/constants/theme';
import { featureCopy } from '@/lib/billing/features';
import { expenseCategories } from '@/lib/mock-data';
import {
  ReceiptCaptureAsset,
  removeUploadedReceiptAsset,
  scanUploadedReceipt,
  uploadReceiptAsset,
} from '@/lib/supabase/receipts';
import { useAppTheme } from '@/providers/app-theme-provider';
import { useLedger } from '@/providers/ledger-provider';

export type ReceiptRequest = {
  /** Photo already chosen by the caller, if any. */
  asset?: ReceiptCaptureAsset | null;
  /** Attach to this existing expense instead of creating a new one. */
  transactionId?: string;
  vendor?: string;
  amount?: string;
  category?: string;
  note?: string;
};

type Attachment = ReceiptCaptureAsset & { storagePath: string | null };

const categories = [uncategorized, ...expenseCategories];

type ReceiptComposerProps = {
  /** Open when non-null. A new object starts a fresh draft. */
  request: ReceiptRequest | null;
  onClose: () => void;
};

/** Sheet for adding a receipt: optional photo, upload, scan (Pro) and the details to save. */
export function ReceiptComposer({ request, onClose }: ReceiptComposerProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      statusBarTranslucent
      visible={request !== null}>
      {/* Mounted per open, so every request starts from a fresh draft. */}
      {request ? <ComposerBody onClose={onClose} request={request} /> : null}
    </Modal>
  );
}

function ComposerBody({ request, onClose }: { request: ReceiptRequest; onClose: () => void }) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { actions, usingLiveBackend } = useLedger();
  const canScan = useFeature('receiptScan');

  const [vendor, setVendor] = useState(request.vendor ?? '');
  const [amount, setAmount] = useState(request.amount ?? '');
  const [category, setCategory] = useState(request.category || uncategorized);
  const [note, setNote] = useState(request.note ?? '');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [errors, setErrors] = useState<{ vendor?: string; amount?: string }>({});

  // Upload path that has not been saved into a receipt yet; removed if the draft is abandoned.
  const pendingUpload = useRef<string | null>(null);
  const attachMode = Boolean(request.transactionId);

  const attach = async (asset: ReceiptCaptureAsset) => {
    setBusy(true);
    setConfidence(null);

    try {
      if (pendingUpload.current) {
        await removeUploadedReceiptAsset(pendingUpload.current);
        pendingUpload.current = null;
      }

      const storagePath = usingLiveBackend ? await uploadReceiptAsset(asset) : null;
      pendingUpload.current = storagePath;
      setAttachment({ ...asset, storagePath });

      if (!storagePath) {
        setMessage('Photo attached');
        return;
      }

      if (!canScan) {
        setMessage('Photo attached');
        return;
      }

      setMessage('Reading…');

      try {
        const draft = await scanUploadedReceipt(storagePath);
        if (draft.vendor) setVendor(draft.vendor);
        if (draft.amount) setAmount(String(draft.amount));
        if (draft.category) setCategory(draft.category);
        if (draft.note) setNote(draft.note);
        setConfidence(draft.confidence ?? null);
        setMessage(
          draft.vendor || draft.amount
            ? 'Filled from photo. Check it.'
            : 'Photo attached',
        );
      } catch (error) {
        console.warn('Receipt scan unavailable:', error);
        setMessage('Scan unavailable');
      }
    } catch (error) {
      Alert.alert(
        'Could not attach the photo',
        error instanceof Error ? error.message : 'Try again, or enter the receipt by hand.',
      );
    } finally {
      setBusy(false);
    }
  };

  // A photo chosen before the sheet opened is uploaded and scanned once, on mount.
  // The ref guards against the double effect run in development, which would upload twice.
  const started = useRef(false);
  useEffect(() => {
    const asset = request.asset;
    if (!asset || started.current) {
      return;
    }
    started.current = true;
    void Promise.resolve().then(() => attach(asset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Closing by any route (Cancel, swipe down, Android back) drops an upload that was never saved.
  useEffect(
    () => () => {
      if (pendingUpload.current) {
        void removeUploadedReceiptAsset(pendingUpload.current);
        pendingUpload.current = null;
      }
    },
    [],
  );

  const discardAndClose = onClose;

  const choosePhoto = async (source: CaptureSource) => {
    const asset = await pickReceiptImage(source);
    if (asset) {
      await attach(asset);
    }
  };

  const removePhoto = () => {
    if (pendingUpload.current) {
      void removeUploadedReceiptAsset(pendingUpload.current);
      pendingUpload.current = null;
    }
    setAttachment(null);
    setConfidence(null);
    setMessage(null);
  };

  const save = async () => {
    const parsed = parseAmount(amount);
    const nextErrors = {
      vendor: vendor.trim() ? undefined : 'Add the vendor.',
      amount: Number.isNaN(parsed) ? 'Enter an amount above zero.' : undefined,
    };
    setErrors(nextErrors);

    if (nextErrors.vendor || nextErrors.amount) {
      return;
    }

    try {
      setSaving(true);
      await actions.addReceipt({
        amount: parsed,
        category,
        confidence,
        note: note.trim() || (attachment ? 'Captured from a receipt photo' : 'Added manually'),
        status: 'Needs review',
        storagePath: attachment?.storagePath ?? null,
        transactionId: request.transactionId,
        vendor: vendor.trim(),
      });
      pendingUpload.current = null;
      onClose();
    } catch (error) {
      Alert.alert(
        'Receipt not saved',
        error instanceof Error ? error.message : 'Unable to save that receipt right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      keyboard
      footer={
        <Button
          disabled={busy}
          label={attachMode ? 'Attach' : 'Save'}
          loading={saving}
          onPress={() => void save()}
        />
      }>
      <View style={styles.topBar}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.flex} variant="heading">
          {attachMode ? 'Attach receipt' : 'New receipt'}
        </Text>
        <Button fullWidth={false} label="Cancel" onPress={discardAndClose} size="small" variant="ghost" />
      </View>

      {attachment ? (
        <Card>
          <View style={styles.preview}>
            <Image
              accessibilityLabel="Receipt photo"
              contentFit="cover"
              source={{ uri: attachment.uri }}
              style={[styles.previewImage, { backgroundColor: theme.surfaceMuted }]}
            />
            <View style={styles.flex}>
              {busy ? <ActivityIndicator color={theme.tint} style={styles.spinner} /> : null}
              <Text tone="muted" variant="small">
                {message ?? 'Photo attached'}
              </Text>
              {confidence !== null ? (
                <Text style={tabularNums} tone="faint" variant="caption">
                  {`Scan confidence ${Math.round(confidence * (confidence <= 1 ? 100 : 1))}%`}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.actions}>
            <Button
              disabled={busy}
              fullWidth={false}
              icon="camera-outline"
              label="Retake"
              onPress={() => void choosePhoto('camera')}
              size="small"
              variant="secondary"
            />
            <Button
              disabled={busy}
              fullWidth={false}
              label="Remove"
              onPress={removePhoto}
              size="small"
              variant="ghost"
            />
          </View>
        </Card>
      ) : (
        <View style={styles.actions}>
          <Button
            disabled={busy}
            fullWidth={false}
            icon="camera-outline"
            label="Camera"
            onPress={() => void choosePhoto('camera')}
            size="small"
            variant="secondary"
          />
          <Button
            disabled={busy}
            fullWidth={false}
            icon="images-outline"
            label="Library"
            onPress={() => void choosePhoto('library')}
            size="small"
            variant="secondary"
          />
        </View>
      )}

      {!canScan ? (
        <Card tone="muted">
          <Text variant="smallMedium">{`${featureCopy.receiptScan.title} is Pro`}</Text>
          <Button
            fullWidth={false}
            label="See Pro"
            onPress={() => {
              discardAndClose();
              router.push('/upgrade');
            }}
            size="small"
            variant="ghost"
          />
        </Card>
      ) : null}

      <Field
        autoCapitalize="words"
        error={errors.vendor}
        label="Vendor"
        onChangeText={setVendor}
        placeholder="Where you paid"
        returnKeyType="next"
        value={vendor}
      />
      <Field
        error={errors.amount}
        keyboardType="decimal-pad"
        label="Amount"
        onChangeText={setAmount}
        placeholder="0.00"
        prefix="$"
        style={tabularNums}
        value={amount}
      />

      <View style={styles.group}>
        <Text tone="muted" variant="smallMedium">
          Category
        </Text>
        <View style={styles.chips}>
          {categories.map((option) => (
            <Chip key={option} label={option} onPress={() => setCategory(option)} selected={category === option} />
          ))}
        </View>
      </View>

      <Field
        autoCapitalize="sentences"
        label="Note"
        multiline
        onChangeText={setNote}
        placeholder="Business purpose"
        value={note}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.md,
  },
  preview: {
    flexDirection: 'row',
    gap: space.md,
  },
  previewImage: {
    borderRadius: radius.sm,
    height: 96,
    width: 72,
  },
  spinner: {
    alignSelf: 'flex-start',
    marginBottom: space.xs,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  group: {
    gap: space.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
