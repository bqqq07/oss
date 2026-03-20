import type { Sale } from "@/types";

export function printReceipt(sale: Sale, storeName = "محل منتجات العناية") {
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>فاتورة #${sale.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Courier New", monospace;
      font-size: 12px;
      width: 80mm;
      margin: 0 auto;
      direction: rtl;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: 15px; }
    .divider { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; }
    .qty { width: 30px; text-align: center; }
    .price { text-align: left; white-space: nowrap; }
    .total-row td { font-weight: bold; border-top: 1px solid #000; padding-top: 4px; }
  </style>
</head>
<body>
  <div class="center bold large">${storeName}</div>
  <div class="center">فاتورة مبيعات</div>
  <div class="divider"></div>
  <div>رقم الفاتورة: ${sale.invoice_number}</div>
  <div>التاريخ: ${new Date(sale.created_at).toLocaleString("ar-SA")}</div>
  ${sale.customer ? `<div>العميل: ${sale.customer.name}</div>` : ""}
  <div class="divider"></div>
  <table>
    <thead>
      <tr>
        <td class="bold">الصنف</td>
        <td class="qty bold">كمية</td>
        <td class="price bold">سعر</td>
        <td class="price bold">المجموع</td>
      </tr>
    </thead>
    <tbody>
      ${(sale.items as Array<{ product: string | { name: string }; qty: number; unit_price: number; discount_pct: number; discount_amt: number; total: number }>)
        .map(
          (item) => `
        <tr>
          <td>${typeof item.product === "object" ? item.product.name : item.product}</td>
          <td class="qty">${item.qty}</td>
          <td class="price">${item.unit_price.toFixed(2)}</td>
          <td class="price">${item.total.toFixed(2)}</td>
        </tr>
        ${item.discount_amt > 0 ? `<tr><td colspan="3" style="color:#666;font-size:11px">خصم</td><td class="price" style="color:#666">-${item.discount_amt.toFixed(2)}</td></tr>` : ""}
      `
        )
        .join("")}
    </tbody>
    <tfoot>
      ${
        sale.discount_amt > 0
          ? `<tr><td colspan="3">خصم الفاتورة</td><td class="price">-${sale.discount_amt.toFixed(2)}</td></tr>`
          : ""
      }
      <tr class="total-row">
        <td colspan="3">الإجمالي</td>
        <td class="price">${sale.total.toFixed(2)} ر.س</td>
      </tr>
    </tfoot>
  </table>
  <div class="divider"></div>
  ${sale.payments
    .map(
      (p) => `
    <div style="display:flex;justify-content:space-between">
      <span>${p.method === "cash" ? "نقداً" : p.method === "mada" ? "مدى" : "فيزا"}</span>
      <span>${p.amount.toFixed(2)} ر.س</span>
    </div>
  `
    )
    .join("")}
  <div class="divider"></div>
  <div class="center" style="margin-top:8px">شكراً لتسوقكم معنا</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=400,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}
