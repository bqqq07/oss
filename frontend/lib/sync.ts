/**
 * Sync Queue — ROLE-12
 *
 * Rules:
 * - Every offline operation enters the queue with uuid + timestamp + status: pending
 * - On reconnect: records are sent to server in chronological order
 * - Server checks UUID — if already exists it ignores (idempotent)
 * - Each record is updated to: synced / conflict / failed
 * - Server wins for invoices
 * - UUID is the reference — not invoice_no
 * - Conflicts appear in manager dashboard
 */

import { v4 as uuidv4 } from "uuid";
import {
  enqueueSyncRecord,
  getPendingSyncRecords,
  updateSyncRecord,
  getSyncRecordsByStatus,
  saveInvoice,
  saveReturn,
  saveCashMovement,
} from "./db";
import { pushSyncRecord } from "./api";
import type {
  SyncRecord,
  OfflineInvoice,
  OfflineReturn,
  OfflineCashMovement,
  SyncStatus,
} from "@/types";

const MAX_RETRIES = 3;

// ─── Enqueue helpers ────────────────────────────────────────────────────────

export async function enqueueInvoice(invoice: OfflineInvoice): Promise<void> {
  // Persist the invoice itself
  await saveInvoice(invoice);

  // Add to sync queue
  const record: SyncRecord = {
    uuid: invoice.uuid,
    type: "invoice",
    payload: invoice,
    status: "pending",
    created_at: invoice.created_at,
    retry_count: 0,
  };
  await enqueueSyncRecord(record);
  notifySyncListeners();
}

export async function enqueueReturn(ret: OfflineReturn): Promise<void> {
  await saveReturn(ret);

  const record: SyncRecord = {
    uuid: ret.uuid,
    type: "return",
    payload: ret,
    status: "pending",
    created_at: ret.created_at,
    retry_count: 0,
  };
  await enqueueSyncRecord(record);
  notifySyncListeners();
}

export async function enqueueCashMovement(movement: OfflineCashMovement): Promise<void> {
  await saveCashMovement(movement);

  const record: SyncRecord = {
    uuid: movement.uuid,
    type: "cash_movement",
    payload: movement,
    status: "pending",
    created_at: movement.created_at,
    retry_count: 0,
  };
  await enqueueSyncRecord(record);
  notifySyncListeners();
}

// ─── Factory helpers for creating offline records ──────────────────────────

export function createOfflineInvoice(
  data: Omit<OfflineInvoice, "uuid" | "created_at">
): OfflineInvoice {
  return {
    ...data,
    uuid: uuidv4(),
    created_at: new Date().toISOString(),
  };
}

export function createOfflineReturn(
  data: Omit<OfflineReturn, "uuid" | "created_at">
): OfflineReturn {
  return {
    ...data,
    uuid: uuidv4(),
    created_at: new Date().toISOString(),
  };
}

export function createOfflineCashMovement(
  data: Omit<OfflineCashMovement, "uuid" | "created_at">
): OfflineCashMovement {
  return {
    ...data,
    uuid: uuidv4(),
    created_at: new Date().toISOString(),
  };
}

// ─── Core sync engine ────────────────────────────────────────────────────────

let _syncing = false;

export async function processSyncQueue(): Promise<SyncSummary> {
  if (_syncing) return { synced: 0, conflicts: 0, failed: 0, skipped: 0 };
  _syncing = true;

  const summary: SyncSummary = { synced: 0, conflicts: 0, failed: 0, skipped: 0 };

  try {
    // Get all pending records in chronological order
    const pending = await getPendingSyncRecords();
    const toProcess = pending.filter((r) => r.status === "pending" || r.status === "failed");

    for (const record of toProcess) {
      if (record.retry_count >= MAX_RETRIES) {
        summary.skipped++;
        continue;
      }

      // Mark as syncing
      await updateSyncRecord({ ...record, status: "syncing" });

      try {
        const result = await pushSyncRecord(record);

        if (result.status === "conflict") {
          // Server wins — mark conflict so manager can review
          await updateSyncRecord({
            ...record,
            status: "conflict",
            synced_at: new Date().toISOString(),
            error: "Server conflict — server version retained",
          });
          summary.conflicts++;
        } else {
          // Success (including "already_exists" — idempotent)
          await updateSyncRecord({
            ...record,
            status: "synced",
            synced_at: new Date().toISOString(),
          });
          summary.synced++;
        }
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unknown error";
        await updateSyncRecord({
          ...record,
          status: "failed",
          retry_count: record.retry_count + 1,
          error,
        });
        summary.failed++;
      }
    }
  } finally {
    _syncing = false;
    notifySyncListeners();
  }

  return summary;
}

export interface SyncSummary {
  synced: number;
  conflicts: number;
  failed: number;
  skipped: number;
}

// ─── Online/offline detection ────────────────────────────────────────────────

export function setupOnlineListener(): () => void {
  const handleOnline = async () => {
    console.log("[Sync] Back online — processing queue…");
    await processSyncQueue();
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}

// ─── Sync state listeners (for UI updates) ──────────────────────────────────

type SyncListener = () => void;
const _listeners = new Set<SyncListener>();

export function subscribeSyncUpdates(fn: SyncListener): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function notifySyncListeners(): void {
  _listeners.forEach((fn) => fn());
}

// ─── Conflict queries ────────────────────────────────────────────────────────

export async function getConflicts(): Promise<SyncRecord[]> {
  return getSyncRecordsByStatus("conflict");
}

export async function getFailedRecords(): Promise<SyncRecord[]> {
  return getSyncRecordsByStatus("failed");
}

// ─── Sync status hook data ───────────────────────────────────────────────────

export async function getSyncStats(): Promise<{
  pending: number;
  conflicts: number;
  failed: number;
  lastSynced?: string;
}> {
  const [pending, conflicts, failed, synced] = await Promise.all([
    getSyncRecordsByStatus("pending"),
    getSyncRecordsByStatus("conflict"),
    getSyncRecordsByStatus("failed"),
    getSyncRecordsByStatus("synced"),
  ]);

  const lastSynced =
    synced.length > 0
      ? synced
          .map((r) => r.synced_at ?? "")
          .filter(Boolean)
          .sort()
          .at(-1)
      : undefined;

  return {
    pending: pending.length,
    conflicts: conflicts.length,
    failed: failed.length,
    lastSynced,
  };
}

// ─── What works offline ──────────────────────────────────────────────────────
// ✅  Sale (invoice)
// ✅  Payment
// ✅  Print (handled by receipt component with cached data)
// ✅  Simple return
// ✅  Shift open / close (cash movement)
//
// ❌  Reports — require server aggregation
// ❌  Purchases — require server inventory updates
// ❌  Settings — require server persistence

export const OFFLINE_CAPABLE = {
  sale: true,
  payment: true,
  print: true,
  simple_return: true,
  shift_open_close: true,
  reports: false,
  purchases: false,
  settings: false,
} as const;
