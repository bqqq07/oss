/**
 * IndexedDB schema — POS Offline Storage
 * Uses the `idb` library for a promise-based API.
 *
 * Stores:
 *  - products          → OfflineProduct cache (for offline search/sale)
 *  - pending_invoices  → invoices created offline, awaiting sync
 *  - pending_returns   → returns created offline, awaiting sync
 *  - pending_cash_movements → shift open/close, cash in/out offline
 *  - sync_queue        → unified ordered queue of all pending operations
 */

import { openDB, type IDBPDatabase } from "idb";
import type {
  OfflineProduct,
  OfflineInvoice,
  OfflineReturn,
  OfflineCashMovement,
  SyncRecord,
} from "@/types";

export interface POSDBSchema {
  products: {
    key: string; // product id
    value: OfflineProduct;
    indexes: { by_sku: string; by_barcode: string; by_name: string };
  };
  pending_invoices: {
    key: string; // uuid
    value: OfflineInvoice;
    indexes: { by_created: string; by_shift: string };
  };
  pending_returns: {
    key: string; // uuid
    value: OfflineReturn;
    indexes: { by_created: string };
  };
  pending_cash_movements: {
    key: string; // uuid
    value: OfflineCashMovement;
    indexes: { by_shift: string; by_created: string };
  };
  sync_queue: {
    key: string; // uuid
    value: SyncRecord;
    indexes: { by_status: string; by_created: string };
  };
}

let _db: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;

  _db = await openDB("pos_offline_db", 1, {
    upgrade(db) {
      // products store
      if (!db.objectStoreNames.contains("products")) {
        const products = db.createObjectStore("products", { keyPath: "id" });
        products.createIndex("by_sku", "sku", { unique: true });
        products.createIndex("by_barcode", "barcode", { unique: false });
        products.createIndex("by_name", "name", { unique: false });
      }

      // pending_invoices store
      if (!db.objectStoreNames.contains("pending_invoices")) {
        const invoices = db.createObjectStore("pending_invoices", {
          keyPath: "uuid",
        });
        invoices.createIndex("by_created", "created_at", { unique: false });
        invoices.createIndex("by_shift", "shift_id", { unique: false });
      }

      // pending_returns store
      if (!db.objectStoreNames.contains("pending_returns")) {
        const returns = db.createObjectStore("pending_returns", {
          keyPath: "uuid",
        });
        returns.createIndex("by_created", "created_at", { unique: false });
      }

      // pending_cash_movements store
      if (!db.objectStoreNames.contains("pending_cash_movements")) {
        const movements = db.createObjectStore("pending_cash_movements", {
          keyPath: "uuid",
        });
        movements.createIndex("by_shift", "shift_id", { unique: false });
        movements.createIndex("by_created", "created_at", { unique: false });
      }

      // sync_queue store
      if (!db.objectStoreNames.contains("sync_queue")) {
        const queue = db.createObjectStore("sync_queue", { keyPath: "uuid" });
        queue.createIndex("by_status", "status", { unique: false });
        queue.createIndex("by_created", "created_at", { unique: false });
      }
    },
  });

  return _db;
}

// ─── Products ───────────────────────────────────────────────────────────────

export async function saveProducts(products: OfflineProduct[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("products", "readwrite");
  await Promise.all(products.map((p) => tx.store.put(p)));
  await tx.done;
}

export async function getProductBySku(sku: string): Promise<OfflineProduct | undefined> {
  const db = await getDB();
  return db.getFromIndex("products", "by_sku", sku);
}

export async function getProductByBarcode(barcode: string): Promise<OfflineProduct | undefined> {
  const db = await getDB();
  return db.getFromIndex("products", "by_barcode", barcode);
}

export async function searchProductsByName(query: string): Promise<OfflineProduct[]> {
  const db = await getDB();
  const all = await db.getAll("products");
  const lower = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(lower) ||
      p.sku.toLowerCase().includes(lower) ||
      p.barcode?.includes(query)
  );
}

export async function getProductCount(): Promise<number> {
  const db = await getDB();
  return db.count("products");
}

// ─── Pending Invoices ────────────────────────────────────────────────────────

export async function saveInvoice(invoice: OfflineInvoice): Promise<void> {
  const db = await getDB();
  await db.put("pending_invoices", invoice);
}

export async function getPendingInvoices(): Promise<OfflineInvoice[]> {
  const db = await getDB();
  return db.getAllFromIndex("pending_invoices", "by_created");
}

export async function deleteInvoice(uuid: string): Promise<void> {
  const db = await getDB();
  await db.delete("pending_invoices", uuid);
}

// ─── Pending Returns ─────────────────────────────────────────────────────────

export async function saveReturn(ret: OfflineReturn): Promise<void> {
  const db = await getDB();
  await db.put("pending_returns", ret);
}

export async function getPendingReturns(): Promise<OfflineReturn[]> {
  const db = await getDB();
  return db.getAllFromIndex("pending_returns", "by_created");
}

export async function deleteReturn(uuid: string): Promise<void> {
  const db = await getDB();
  await db.delete("pending_returns", uuid);
}

// ─── Pending Cash Movements ──────────────────────────────────────────────────

export async function saveCashMovement(movement: OfflineCashMovement): Promise<void> {
  const db = await getDB();
  await db.put("pending_cash_movements", movement);
}

export async function getPendingCashMovements(): Promise<OfflineCashMovement[]> {
  const db = await getDB();
  return db.getAllFromIndex("pending_cash_movements", "by_created");
}

export async function deleteCashMovement(uuid: string): Promise<void> {
  const db = await getDB();
  await db.delete("pending_cash_movements", uuid);
}

// ─── Sync Queue ──────────────────────────────────────────────────────────────

export async function enqueueSyncRecord(record: SyncRecord): Promise<void> {
  const db = await getDB();
  await db.put("sync_queue", record);
}

export async function getPendingSyncRecords(): Promise<SyncRecord[]> {
  const db = await getDB();
  // Return in chronological order
  return db.getAllFromIndex("sync_queue", "by_created");
}

export async function getSyncRecordsByStatus(status: SyncRecord["status"]): Promise<SyncRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex("sync_queue", "by_status", status);
}

export async function updateSyncRecord(record: SyncRecord): Promise<void> {
  const db = await getDB();
  await db.put("sync_queue", record);
}

export async function deleteSyncRecord(uuid: string): Promise<void> {
  const db = await getDB();
  await db.delete("sync_queue", uuid);
}

export async function getAllSyncRecords(): Promise<SyncRecord[]> {
  const db = await getDB();
  return db.getAll("sync_queue");
}

export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  return db.countFromIndex("sync_queue", "by_status", "pending");
}
