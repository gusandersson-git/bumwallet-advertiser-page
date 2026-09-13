<?php
$line = date('c') . ' ' . $_SERVER['REQUEST_METHOD'] . ' ' . json_encode([
    'get'  => $_GET,
    'post' => $_POST,
    'ip'   => $_SERVER['REMOTE_ADDR'],
]) . PHP_EOL;

file_put_contents(__DIR__ . '/postbacks.log', $line, FILE_APPEND | LOCK_EX);

header('Content-Type: text/plain');
echo 'OK';
