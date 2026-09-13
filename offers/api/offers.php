<?php
header('Content-Type: application/json');

$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['status' => 500, 'error' => 'Copy config.example.php to config.php and fill in your keys.']);
    exit;
}
$config = require $configFile;

$userId  = isset($_GET['id']) ? trim($_GET['id']) : '';
$country = isset($_GET['country']) ? strtoupper(trim($_GET['country'])) : $config['default_country'];

if ($userId === '' || !preg_match('/^[A-Za-z0-9_\-]{1,64}$/', $userId)) {
    http_response_code(400);
    echo json_encode(['status' => 400, 'error' => 'Invalid user id.']);
    exit;
}
if (!preg_match('/^[A-Z]{2}$/', $country)) {
    $country = $config['default_country'];
}

$ip = $_SERVER['HTTP_CF_CONNECTING_IP']
    ?? (isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]) : null)
    ?? $_SERVER['REMOTE_ADDR'];

$query = http_build_query([
    'api'     => $config['public_api_key'],
    'token'   => $config['bearer_token'],
    'id'      => $userId,
    'ip'      => $ip,
    'country' => $country,
]);

$ch = curl_init('https://offerwall.me/offerapi.php?' . $query);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_FOLLOWLOCATION => true,
]);
$body = curl_exec($ch);
$err  = curl_error($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($body === false) {
    http_response_code(502);
    echo json_encode(['status' => 502, 'error' => 'Upstream request failed: ' . $err]);
    exit;
}

$decoded = json_decode($body, true);
if (!is_array($decoded)) {
    http_response_code(502);
    echo json_encode(['status' => 502, 'error' => 'Upstream returned non JSON', 'http_code' => $code, 'raw' => substr($body, 0, 500)]);
    exit;
}

echo json_encode($decoded);
