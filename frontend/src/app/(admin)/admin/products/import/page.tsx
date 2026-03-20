'use client';

import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import AccessDenied from '@/components/ui/AccessDenied';
import Link from 'next/link';

interface ProductRow {
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  min_stock_level: number;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

const REQUIRED_COLUMNS = ['name', 'sku', 'category', 'unit', 'cost_price', 'selling_price'];

const COLUMN_MAP: Record<string, string> = {
  'اسم المنتج': 'name',
  الاسم: 'name',
  name: 'name',
  'كود المنتج': 'sku',
  sku: 'sku',
  SKU: 'sku',
  باركود: 'barcode',
  barcode: 'barcode',
  الفئة: 'category',
  category: 'category',
  الماركة: 'brand',
  brand: 'brand',
  الوحدة: 'unit',
  unit: 'unit',
  'سعر التكلفة': 'cost_price',
  cost_price: 'cost_price',
  'سعر البيع': 'selling_price',
  selling_price: 'selling_price',
  'الحد الأدنى للمخزون': 'min_stock_level',
  min_stock_level: 'min_stock_level',
};

const BATCH_SIZE = 50;

export default function ProductsImportPage() {
  const canImport = usePermission('products.import');

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseExcel = useCallback((f: File) => {
    setParseError(null);
    setPreview([]);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (raw.length === 0) {
          setParseError('الملف فارغ أو لا يحتوي على بيانات');
          return;
        }

        // Normalize column names
        const rows: ProductRow[] = raw.map((r) => {
          const normalized: Record<string, unknown> = {};
          for (const [key, val] of Object.entries(r)) {
            const mapped = COLUMN_MAP[key.trim()] ?? key.trim().toLowerCase().replace(/ /g, '_');
            normalized[mapped] = val;
          }
          return {
            name: String(normalized.name ?? '').trim(),
            sku: String(normalized.sku ?? '').trim(),
            barcode: normalized.barcode ? String(normalized.barcode).trim() : undefined,
            category: String(normalized.category ?? '').trim(),
            brand: normalized.brand ? String(normalized.brand).trim() : undefined,
            unit: String(normalized.unit ?? '').trim(),
            cost_price: Number(normalized.cost_price ?? 0),
            selling_price: Number(normalized.selling_price ?? 0),
            min_stock_level: Number(normalized.min_stock_level ?? 0),
          };
        });

        // Validate required columns
        const missing = REQUIRED_COLUMNS.filter((col) => {
          const sample = rows[0] as unknown as Record<string, unknown>;
          return sample[col] === undefined || sample[col] === '';
        });
        if (missing.length > 0) {
          setParseError(`الأعمدة المطلوبة غير موجودة: ${missing.join(', ')}`);
          return;
        }

        setPreview(rows.slice(0, 5));
        setFile(f);
      } catch {
        setParseError('فشل قراءة الملف. تأكد أنه ملف Excel صحيح (.xlsx أو .xls)');
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseExcel(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) parseExcel(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setProgress(0);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const rows: ProductRow[] = raw.map((r) => {
        const normalized: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(r)) {
          const mapped = COLUMN_MAP[key.trim()] ?? key.trim().toLowerCase().replace(/ /g, '_');
          normalized[mapped] = val;
        }
        return {
          name: String(normalized.name ?? '').trim(),
          sku: String(normalized.sku ?? '').trim(),
          barcode: normalized.barcode ? String(normalized.barcode).trim() : undefined,
          category: String(normalized.category ?? '').trim(),
          brand: normalized.brand ? String(normalized.brand).trim() : undefined,
          unit: String(normalized.unit ?? '').trim(),
          cost_price: Number(normalized.cost_price ?? 0),
          selling_price: Number(normalized.selling_price ?? 0),
          min_stock_level: Number(normalized.min_stock_level ?? 0),
        };
      });

      const total = rows.length;
      const errors: { row: number; message: string }[] = [];
      let successCount = 0;

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        try {
          const { data: res } = await api.post('/products/bulk_create/', { products: batch });
          successCount += res.created ?? batch.length;
          if (res.errors) {
            for (const err of res.errors) {
              errors.push({ row: i + err.index + 2, message: err.message });
            }
          }
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { detail?: string } } };
          const msg = axiosErr?.response?.data?.detail ?? 'خطأ في الخادم';
          batch.forEach((_, idx) => {
            errors.push({ row: i + idx + 2, message: msg });
          });
        }
        setProgress(Math.round(((i + batch.length) / total) * 100));
      }

      setResult({ success: successCount, failed: errors.length, errors: errors.slice(0, 50) });
      setImporting(false);
    };
    reader.readAsArrayBuffer(file);
  };

  if (!canImport) return <AccessDenied />;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="text-gray-400 hover:text-gray-600">
          ← المنتجات
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">استيراد المنتجات من Excel</h1>
      </div>

      {/* Template download hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-800">
        <strong>الأعمدة المطلوبة:</strong> name, sku, category, unit, cost_price, selling_price
        <br />
        <strong>الأعمدة الاختيارية:</strong> barcode, brand, min_stock_level
        <br />
        يمكن استخدام أسماء الأعمدة بالعربية أو الإنجليزية. الملف يدعم حتى 2000+ صنف.
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition mb-4"
      >
        <div className="text-4xl mb-3">📄</div>
        <p className="text-gray-600 font-medium">اسحب ملف Excel هنا أو انقر للاختيار</p>
        <p className="text-gray-400 text-sm mt-1">(.xlsx, .xls)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">
          ❌ {parseError}
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-700 text-sm">
            معاينة أول 5 صفوف
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['الاسم', 'SKU', 'الفئة', 'الوحدة', 'سعر التكلفة', 'سعر البيع'].map((h) => (
                    <th key={h} className="text-right px-3 py-2 text-gray-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">{row.name}</td>
                    <td className="px-3 py-2 font-mono">{row.sku}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2">{row.unit}</td>
                    <td className="px-3 py-2">{row.cost_price}</td>
                    <td className="px-3 py-2">{row.selling_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Progress */}
      {importing && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>جارٍ الاستيراد...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-4">
          <h3 className="font-semibold text-gray-800 mb-3">نتيجة الاستيراد</h3>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{result.success}</div>
              <div className="text-xs text-gray-500">تمّ بنجاح</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{result.failed}</div>
              <div className="text-xs text-gray-500">فشل</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto">
              <p className="text-xs font-medium text-gray-600 mb-2">تفاصيل الأخطاء:</p>
              {result.errors.map((err, i) => (
                <div key={i} className="text-xs text-red-600 py-0.5">
                  الصف {err.row}: {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {file && !importing && (
        <div className="flex gap-3">
          <button
            onClick={handleImport}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            بدء الاستيراد
          </button>
          <button
            onClick={() => {
              setFile(null);
              setPreview([]);
              setResult(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
}
