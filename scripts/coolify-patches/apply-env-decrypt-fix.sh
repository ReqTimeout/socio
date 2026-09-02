#!/bin/bash
# Coolify v4.3.14 bug fixes — apply after every container restart
# 
# 2 bugs fixed:
#   1. get_environment_variables() missing un unserialize() — plaintext values like "3000"
#      stored serialized ("s:4:\"3000\";"), container gets ciphertext, NODE Node crashes
#   2. get_environment_variables() unserialize fails for non-serialized plaintext — fallback
#      `?? decrypt($raw)` re-decrypts already-decrypted data, returning empty string

set -e
DOCKER="docker exec -u root coolify"

# Bug 1+2 combined fix
$DOCKER php <<'PHPEOF'
<?php
$path = '/var/www/html/app/Models/EnvironmentVariable.php';
$content = file_get_contents($path);

$old = "return trim(@unserialize(decrypt(\$environment_variable)) ?? decrypt(\$environment_variable));";
$new = <<<'PHP'
    $decrypted = decrypt($environment_variable);
    $unserialized = @unserialize($decrypted);
    if ($unserialized === false && $decrypted !== 'b:0;') {
        $value = $decrypted;
    } else {
        $value = $unserialized === false ? $decrypted : $unserialized;
    }
    return trim((string) $value);
PHP;

if (strpos($content, $old) !== false) {
  $content = str_replace($old, $new, $content);
  file_put_contents($path, $content);
  echo "Patched: unserialize fallback\n";
} else {
  echo "Already patched (unserialize fallback)\n";
}
PHPEOF

# Verify patch
$DOCKER sed -n '358,375p' /var/www/html/app/Models/EnvironmentVariable.php

echo
echo "=== Done. Verify in app: ==="
echo 'curl -X POST https://app.socio.id/api/auth/sign-up/email -d '"'"'{"email":"verify@socio.id","password":"Test123!","name":"V","username":"verify"}'"'"' -H Content-Type:application/json'