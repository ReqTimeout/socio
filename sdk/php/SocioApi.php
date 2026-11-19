<?php
/**
 * Socio Reseller API — client resmi PHP (SDK Tier 1).
 *
 * Drop-in kompatibel dengan format API panel SMM v2 populer. Khusus akun
 * Reseller / Agen. Mata uang: IDR (rupiah). Butuh ext-curl + ext-json.
 *
 *   $api = new SocioApi('API_KEY_KAMU');
 *   print_r($api->balance());
 *   $order = $api->add(['service' => 1234, 'link' => 'https://...', 'quantity' => 1000]);
 *   print_r($api->status($order['order']));
 */

class SocioApiException extends RuntimeException {}

class SocioApi
{
    public string $baseUrl;
    private string $apiKey;
    private int $timeout;
    private ?string $apiSecret;

    public function __construct(string $apiKey, ?string $baseUrl = null, int $timeout = 30, ?string $apiSecret = null)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl ?? 'https://app.socio.id/api/v1', '/');
        $this->timeout = $timeout;
        $this->apiSecret = $apiSecret; // Tier 3 HMAC: auto-sign kalau diset
    }

    private function call(string $action, array $params = []): mixed
    {
        $params = array_merge(['key' => $this->apiKey, 'action' => $action], $params);
        $params = array_filter($params, fn($v) => $v !== null && $v !== '');
        if ($this->apiSecret) {
            $params['timestamp'] = (string) time();
            $keys = array_keys($params);
            sort($keys);
            $parts = [];
            // Canonical (Susulan 50): urlencode key+value setara encodeURIComponent JS
            // (rawurlencode + kembalikan !'()* yang tidak di-encode oleh encodeURIComponent).
            $enc = fn($s) => str_replace(['%21', '%27', '%28', '%29', '%2A'], ['!', "'", '(', ')', '*'], rawurlencode((string) $s));
            foreach ($keys as $k) { if ($k !== 'signature') $parts[] = $enc($k) . '=' . $enc($params[$k]); }
            $params['signature'] = hash_hmac('sha256', implode('&', $parts), $this->apiSecret);
        }
        $ch = curl_init($this->baseUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($params),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $raw = curl_exec($ch);
        if ($raw === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new SocioApiException('Error HTTP: ' . $err);
        }
        curl_close($ch);
        $body = json_decode($raw, true);
        if (is_array($body) && isset($body['error'])) {
            throw new SocioApiException($body['error']);
        }
        return $body;
    }

    public function services(): array { return $this->call('services'); }
    public function balance(bool $sandbox = false): array { return $this->call('balance', ['sandbox' => $sandbox ? '1' : null]); }
    public function profile(): array { return $this->call('profile'); }

    /** Buat secret HMAC request-signing baru (Tier 3). Return {api_secret, sign_required}. */
    public function setApiSecret(?bool $requireSignature = null): array
    {
        return $this->call('set_api_secret', [
            'require_signature' => $requireSignature === null ? null : ($requireSignature ? '1' : '0'),
        ]);
    }

    /** Buat order. $params = field sesuai tipe layanan (service, link, quantity, ...).
     *  $idempotencyKey bikin retry aman (key sama → order sama, tanpa charge ganda). */
    public function add(array $params, ?string $idempotencyKey = null): array
    {
        if ($idempotencyKey !== null) $params['idempotency_key'] = $idempotencyKey;
        return $this->call('add', $params);
    }

    public function status(string|int|null $order = null, ?array $orders = null): mixed
    {
        if ($orders !== null) return $this->call('status', ['orders' => implode(',', $orders)]);
        return $this->call('status', ['order' => $order]);
    }

    /** Riwayat order. $status pakai enum API (Completed, In progress, ...). */
    public function orders(?string $status = null, ?int $service = null, int $limit = 50, int $offset = 0): array
    {
        return $this->call('orders', [
            'status' => $status, 'service' => $service, 'limit' => $limit, 'offset' => $offset,
        ]);
    }

    public function refill(string|int|null $order = null, ?array $orders = null): mixed
    {
        if ($orders !== null) return $this->call('refill', ['orders' => implode(',', $orders)]);
        return $this->call('refill', ['order' => $order]);
    }

    public function refillStatus(string|int|null $refill = null, ?array $refills = null): mixed
    {
        if ($refills !== null) return $this->call('refill_status', ['refills' => implode(',', $refills)]);
        return $this->call('refill_status', ['refill' => $refill]);
    }

    public function cancel(array $orders): array
    {
        return $this->call('cancel', ['orders' => implode(',', $orders)]);
    }

    /** Buat hingga 100 order dalam 1 request. $orders = array parameter add.
     *  Return [{order}|{error}] selaras input; item gagal refund sendiri-sendiri. */
    public function bulkAdd(array $orders): array
    {
        return $this->call('bulk_add', ['orders' => json_encode($orders)]);
    }

    /** Set URL callback status order (https publik). '' = nonaktif. Return
     *  {webhook_url, webhook_secret, enabled}. Verifikasi: hash_hmac('sha256', body, secret). */
    public function setWebhook(string $url, bool $regenerateSecret = false): array
    {
        return $this->call('set_webhook', [
            'url' => $url, 'regenerate_secret' => $regenerateSecret ? '1' : null,
        ]);
    }

    /** Buat invoice top-up manual BCA (pending; admin konfirmasi kredit saldo). */
    public function deposit(float $amount): array { return $this->call('deposit', ['amount' => $amount]); }
    public function deposits(int $limit = 50, int $offset = 0): array { return $this->call('deposits', ['limit' => $limit, 'offset' => $offset]); }
    /** Statistik affiliate (read-only). Penarikan tetap di web app. */
    public function affiliate(): array { return $this->call('affiliate'); }
}