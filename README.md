# 🤖 Token Watchlist Bot

Bot Telegram yang simpan watchlist token crypto + auto-log ke channel pribadi kamu + price alert.

## Flow

```
Kamu chat Claude → Claude verdict "lolos filter" → Claude kasih command
                                                          ↓
                                         Kamu paste command ke bot Telegram
                                                          ↓
                              Bot auto-fetch harga/mcap/link dari DexScreener
                                                          ↓
                                   Bot post info ke CHANNEL pribadi kamu
                                                          ↓
                                 Kamu punya feed rapi semua token yang lolos
                                                          ↓
                          Auto-alert ke channel kalau ada yang turun >20%
```

## Fitur

- ✅ `/add <CA> <chain> [kategori] [catatan]` — Tambah token, auto-post ke channel
- 📋 `/list` — Lihat semua token + harga terkini + % perubahan
- 🗑️ `/remove <CA>` — Hapus dari watchlist
- 💰 `/price <CA>` — Cek harga token cepat (tanpa nyimpen)
- 🚨 **Auto alert ke channel** — Cek tiap 1 jam, notif kalau ada token turun >20%

---

## Setup (10 menit)

### 1. Bikin bot Telegram

1. Chat **@BotFather** di Telegram
2. Kirim `/newbot`, kasih nama & username bot
3. Copy **bot token** (formatnya `1234567890:ABCdef...`)

### 2. Bikin channel log

1. Telegram → **New Channel** → kasih nama (contoh: "My Token Watchlist")
2. Pilih **Private** (recommended) atau Public
3. Add bot kamu sebagai **Admin** di channel ini
   - Buka channel → Info → Administrators → Add Admin → cari username bot kamu
   - **Wajib aktifkan permission "Post Messages"**

### 3. Dapetin Channel ID

**Kalau channel public** (punya @username):
- Channel ID-nya ya `@namachannel`

**Kalau channel private:**
- Kirim sembarang pesan di channel kamu
- Forward pesan itu ke **@userinfobot** (atau @getidsbot)
- Dia akan balas dengan ID yang formatnya `-1001234567890`
- Copy angka itu (termasuk tanda minusnya)

### 4. Dapetin User ID kamu

1. Chat **@userinfobot** di Telegram
2. Copy angka di field **Id** (contoh: `123456789`)

### 5. Deploy ke Railway

**Cara A — via GitHub (recommended):**

1. Bikin repo GitHub baru, push semua file ini ke sana
2. Buka [railway.app](https://railway.app) → login → **New Project** → **Deploy from GitHub repo**
3. Pilih repo kamu
4. Tab **Variables**, tambah:
   - `BOT_TOKEN` = (token dari BotFather)
   - `OWNER_ID` = (user ID kamu)
   - `CHANNEL_ID` = (channel ID, contoh `@mywatchlist` atau `-1001234567890`)
5. Tunggu status **Active** (~2 menit)

**Cara B — via Railway CLI:**

```bash
npm i -g @railway/cli
railway login
railway init
railway variables set BOT_TOKEN=xxx
railway variables set OWNER_ID=xxx
railway variables set CHANNEL_ID=@xxx
railway up
```

### 6. Test

1. Chat DM sama bot → kirim `/start` → bot harus balas
2. Kirim `/add G8dUSvywefr4GvfFZBZiLHmbjnwjrrJPAnVifjj7pump solana meme test` → cek dua hal:
   - Bot reply di DM dengan info token
   - Pesan yang sama muncul di channel kamu
3. Kalau ada error "Gagal post ke channel", berarti bot belum jadi admin atau CHANNEL_ID salah

---

## Pemakaian sehari-hari

1. Kamu kirim CA ke Claude: *"ini token apa? xyz..."*
2. Claude jawab format:
   > ✅ Lolos filter
3. Claude kasih command siap-copy:
   ```
   /add G8dUSvywefr4GvfFZBZiLHmbjnwjrrJPAnVifjj7pump solana meme viral_juni_2025
   ```
4. Kamu paste ke bot
5. Info token auto muncul di channel kamu, lengkap dengan harga/mcap/link

Buka channel kapan aja buat review semua token yang pernah kamu track.

---

## Catatan penting

⚠️ **Data persistence di Railway:**
Database SQLite di filesystem container bisa hilang kalau redeploy. Solusi:
- Railway dashboard → Settings → **Volumes** → Mount ke `/app/data`
- Tambah env `DB_PATH=/app/data/watchlist.db`

⚠️ **Bot HARUS admin di channel:**
Kalau cuma member biasa, `post_to_channel()` bakal gagal. Pastiin permission "Post Messages" aktif.

⚠️ **CHANNEL_ID format:**
- Public: `@namachannel` (dengan @)
- Private: `-1001234567890` (dengan tanda minus)
- Jangan pake username bot atau user ID biasa

⚠️ **Kalau CHANNEL_ID ga diset:**
Bot tetap jalan, tapi info cuma di-reply ke DM. Alert juga fallback ke DM owner.

---

## Customization

Edit di `bot.py`:

```python
PRICE_CHECK_INTERVAL = 3600   # interval cek harga (detik). 3600=1jam, 1800=30mnt
ALERT_DROP_PCT = 20.0          # threshold alert (%). 20=alert kalau turun >20%
```

Commit & push → Railway auto-redeploy.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot ga balas sama sekali | Cek `BOT_TOKEN` bener, cek Railway logs |
| "Gagal post ke channel" | Bot belum admin, atau `CHANNEL_ID` salah |
| "Token ga ketemu di DexScreener" | CA salah / token terlalu baru / ga ada LP |
| Alert ga pernah keluar | Harga belum turun >20%, atau target channel invalid |
| Data hilang tiap redeploy | Setup Railway Volume (lihat "Data persistence" di atas) |
