"""
Contoh: bot order Telegram berbasis Socio Reseller API (SDK Tier 1).

Bot minimal yang memungkinkan reseller buat order, cek status dan saldo dari
Telegram. Mendemonstrasikan idempotency key (retry aman) dan riwayat order.

Install:
    pip install python-telegram-bot==21.* socio_api   # atau taruh socio_api.py di sebelah file ini

Jalankan:
    SOCIO_API_KEY=xxxx TELEGRAM_BOT_TOKEN=yyyy python telegram-bot.py

Perintah:
    /balance                     → tampilkan saldo IDR
    /order <service> <link> <qty>→ buat order (idempoten per chat+payload)
    /status <order_id>           → cek satu order
    /history                     → 10 order terakhir
"""

import hashlib
import os

from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

from socio_api import SocioApi, SocioApiError

api = SocioApi(os.environ["SOCIO_API_KEY"])


async def balance(update: Update, _: ContextTypes.DEFAULT_TYPE):
    b = api.balance()
    await update.message.reply_text(f"Saldo: {b['balance']} {b['currency']}")


async def order(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        service, link, qty = int(context.args[0]), context.args[1], int(context.args[2])
    except (IndexError, ValueError):
        await update.message.reply_text("Pakai: /order <service> <link> <quantity>")
        return
    # Idempotency key dari chat + payload → double-tap tidak bikin charge ganda.
    idem = hashlib.sha256(f"{update.effective_chat.id}:{service}:{link}:{qty}".encode()).hexdigest()[:32]
    try:
        res = api.add(service=service, link=link, quantity=qty, idempotency_key=idem)
        await update.message.reply_text(f"Order dibuat: {res['order']}")
    except SocioApiError as e:
        await update.message.reply_text(f"Gagal: {e}")


async def status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text("Pakai: /status <order_id>")
        return
    try:
        s = api.status(context.args[0])
        await update.message.reply_text(
            f"#{context.args[0]}: {s['status']} | charge {s['charge']} {s['currency']} | remains {s['remains']}"
        )
    except SocioApiError as e:
        await update.message.reply_text(f"Gagal: {e}")


async def history(update: Update, _: ContextTypes.DEFAULT_TYPE):
    rows = api.orders(limit=10)
    if not rows:
        await update.message.reply_text("Belum ada order.")
        return
    lines = [f"#{r['order']} {r['status']} — {r['name']} ({r['charge']} {r['currency']})" for r in rows]
    await update.message.reply_text("\n".join(lines))


def main():
    app = Application.builder().token(os.environ["TELEGRAM_BOT_TOKEN"]).build()
    app.add_handler(CommandHandler("balance", balance))
    app.add_handler(CommandHandler("order", order))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("history", history))
    app.run_polling()


if __name__ == "__main__":
    main()