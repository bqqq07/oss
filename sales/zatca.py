"""
ZATCA Phase-2 QR Code — TLV (Tag-Length-Value) Base64 encoder/decoder.

Tag map (per ZATCA e-Invoicing specification):
  1  →  Seller name
  2  →  VAT registration number  (15 digits)
  3  →  Invoice timestamp         (ISO 8601, UTC)
  4  →  Invoice total             (inc. VAT, 2 decimal places)
  5  →  VAT amount                (2 decimal places)

Usage::

    from sales.zatca import generate_zatca_qr
    qr_b64 = generate_zatca_qr(
        seller_name="شركة الجمال للعناية",
        vat_number="310122393500003",
        invoice_date=invoice.sold_at,
        total_with_vat=invoice.total,
        vat_amount=invoice.vat_amount,
    )
"""

import base64
from datetime import datetime
from decimal import Decimal


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _tlv(tag: int, value: str) -> bytes:
    """Encode a single TLV triplet (tag, length, value)."""
    encoded = value.encode("utf-8")
    if len(encoded) > 255:
        raise ValueError(
            f"ZATCA TLV tag {tag}: value is {len(encoded)} bytes "
            f"(max 255). Truncate before passing."
        )
    return bytes([tag, len(encoded)]) + encoded


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_zatca_qr(
    seller_name: str,
    vat_number: str,
    invoice_date: datetime,
    total_with_vat: Decimal,
    vat_amount: Decimal,
) -> str:
    """
    Return a Base64-encoded ZATCA TLV QR string.

    Args:
        seller_name:    Seller's registered company name.
        vat_number:     15-digit VAT registration number.
        invoice_date:   Invoice date/time (rendered as UTC, ``%Y-%m-%dT%H:%M:%SZ``).
        total_with_vat: Invoice grand total including VAT.
        vat_amount:     VAT portion of the invoice total.

    Returns:
        Base64 string ready to be embedded in a QR code image.
    """
    timestamp = invoice_date.strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = (
        _tlv(1, seller_name)
        + _tlv(2, vat_number)
        + _tlv(3, timestamp)
        + _tlv(4, f"{total_with_vat:.2f}")
        + _tlv(5, f"{vat_amount:.2f}")
    )

    return base64.b64encode(payload).decode("utf-8")


def decode_zatca_qr(qr_string: str) -> dict:
    """
    Decode a ZATCA TLV Base64 QR string back to its named components.

    Useful for verification and testing.

    Returns:
        dict with keys: seller_name, vat_number, timestamp,
        total_with_vat, vat_amount.
    """
    tag_names = {
        1: "seller_name",
        2: "vat_number",
        3: "timestamp",
        4: "total_with_vat",
        5: "vat_amount",
    }

    data = base64.b64decode(qr_string)
    result: dict = {}
    i = 0
    while i < len(data):
        tag = data[i]
        length = data[i + 1]
        value = data[i + 2 : i + 2 + length].decode("utf-8")
        if tag in tag_names:
            result[tag_names[tag]] = value
        i += 2 + length

    return result
