"""
Socio Reseller API — client resmi Python (SDK Tier 1).

Drop-in kompatibel dengan format API panel SMM v2 populer. Bisa dipakai akun
Reseller / Agen mana pun di Socio.id. Mata uang: IDR (rupiah).

    from socio_api import SocioApi
    api = SocioApi("API_KEY_KAMU")
    print(api.balance())
    order = api.add(service=1234, link="https://instagram.com/p/xxx", quantity=1000)
    print(api.status(order["order"]))

Hanya butuh standard library (urllib). Tanpa dependensi pihak ketiga.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
import urllib.parse
import urllib.request
from typing import Any


class SocioApiError(Exception):
    """Dilempar saat API mengembalikan payload {"error": ...}."""


def _sign_enc(value: Any) -> str:
    # urlencode setara encodeURIComponent JS (safe="!'()*" = set unreserved yang sama).
    return urllib.parse.quote(str(value), safe="!'()*")


class SocioApi:
    BASE_URL = "https://app.socio.id/api/v1"

    def __init__(self, api_key: str, base_url: str | None = None, timeout: int = 30,
                 api_secret: str | None = None):
        self.api_key = api_key
        self.base_url = (base_url or self.BASE_URL).rstrip("/")
        self.timeout = timeout
        # Opsional Tier 3 HMAC: kalau diset, setiap request otomatis ditandatangani
        # (timestamp + signature). Dapatkan secret via set_api_secret().
        self.api_secret = api_secret

    def _call(self, action: str, **params: Any) -> Any:
        payload = {"key": self.api_key, "action": action}
        payload.update({k: str(v) for k, v in params.items() if v is not None})
        if self.api_secret:
            payload["timestamp"] = str(int(time.time()))
            # Canonical (Susulan 50): urlencode key+value setara encodeURIComponent JS.
            canonical = "&".join(
                f"{_sign_enc(k)}={_sign_enc(payload[k])}"
                for k in sorted(payload) if k != "signature"
            )
            payload["signature"] = hmac.new(
                self.api_secret.encode(), canonical.encode(), hashlib.sha256
            ).hexdigest()
        data = urllib.parse.urlencode(payload).encode()
        req = urllib.request.Request(
            self.base_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            body = json.loads(resp.read().decode())
        if isinstance(body, dict) and "error" in body:
            raise SocioApiError(body["error"])
        return body

    # ── katalog / akun ───────────────────────────────────────────────────
    def services(self) -> list[dict]:
        return self._call("services")

    def balance(self, sandbox: bool = False) -> dict:
        return self._call("balance", sandbox="1" if sandbox else None)

    def profile(self) -> dict:
        return self._call("profile")

    def set_api_secret(self, require_signature: bool | None = None) -> dict:
        """Buat secret HMAC request-signing baru (Tier 3). Opsional wajibkan
        signature di setiap request. Return {api_secret, sign_required}. Teruskan
        secret ke SocioApi(api_secret=...) untuk auto-sign panggilan berikutnya."""
        req = None if require_signature is None else ("1" if require_signature else "0")
        return self._call("set_api_secret", require_signature=req)

    # ── order ────────────────────────────────────────────────────────────
    def add(self, service: int, idempotency_key: str | None = None, **params: Any) -> dict:
        """Buat order. Teruskan field sesuai tipe layanan (link, quantity, comments,
        username, runs, interval, ...) sebagai kwargs. idempotency_key bikin retry
        aman: key sama mengembalikan order sama tanpa charge ganda."""
        return self._call("add", service=service, idempotency_key=idempotency_key, **params)

    def status(self, order: str | int | None = None, orders: list | None = None) -> Any:
        if orders is not None:
            return self._call("status", orders=",".join(str(o) for o in orders))
        return self._call("status", order=order)

    def orders(self, status: str | None = None, service: int | None = None,
               limit: int = 50, offset: int = 0) -> list[dict]:
        """Riwayat order. Filter status pakai enum API (Pending, Processing,
        In progress, Completed, Partial, Canceled, Error)."""
        return self._call("orders", status=status, service=service, limit=limit, offset=offset)

    # ── refill / cancel ──────────────────────────────────────────────────
    def refill(self, order: str | int | None = None, orders: list | None = None) -> Any:
        if orders is not None:
            return self._call("refill", orders=",".join(str(o) for o in orders))
        return self._call("refill", order=order)

    def refill_status(self, refill: str | int | None = None, refills: list | None = None) -> Any:
        if refills is not None:
            return self._call("refill_status", refills=",".join(str(r) for r in refills))
        return self._call("refill_status", refill=refill)

    def cancel(self, orders: list) -> list:
        return self._call("cancel", orders=",".join(str(o) for o in orders))

    # ── Tier 2: bulk + webhook ───────────────────────────────────────────
    def bulk_add(self, orders: list[dict]) -> list:
        """Buat hingga 100 order dalam 1 request. Setiap item adalah dict parameter
        add (service, link, quantity, ... opsional idempotency_key). Return list
        {order} atau {error} selaras urutan input; item gagal di-refund sendiri
        dan tidak menghentikan yang lain."""
        return self._call("bulk_add", orders=json.dumps(orders))

    def set_webhook(self, url: str, regenerate_secret: bool = False) -> dict:
        """Set URL callback status order (https publik). url kosong = nonaktif.
        Return {webhook_url, webhook_secret, enabled}. Verifikasi setiap callback:
        HMAC-SHA256(raw_body, webhook_secret) hex == header X-Socio-Signature."""
        return self._call(
            "set_webhook", url=url, regenerate_secret="1" if regenerate_secret else None
        )

    def deposit(self, amount: float) -> dict:
        """Buat invoice top-up manual BCA (pending). Saldo baru dikredit setelah
        admin konfirmasi. Return {invoice, transfer_amount, credited, bonus,
        suffix, method, status, expire, bank_number, bank_name, currency}."""
        return self._call("deposit", amount=amount)

    def deposits(self, limit: int = 50, offset: int = 0) -> list:
        """Riwayat deposit (read-only)."""
        return self._call("deposits", limit=limit, offset=offset)

    def affiliate(self) -> dict:
        """Statistik affiliate (read-only): commission, withdrawn, requested, downline,
        can_withdraw, min_withdraw, ref_code, ref_link. Penarikan tetap di web app."""
        return self._call("affiliate")