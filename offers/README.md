# BumWallet Offerwall.me test

Static offers page plus the smallest possible server piece so the Bearer token never reaches the browser.

## Files

- `index.html` renders the offer list and opens each offer's returned `url` in a new tab.
- `api/offers.php` calls `https://offerwall.me/offerapi.php` with your keys, the user's ID, IP and country, and returns the JSON as is.
- `api/postback.php` logs every postback hit to `api/postbacks.log` and replies `OK`. Crediting logic comes later with the real backend.
- `api/config.example.php` copy to `api/config.php` and fill in the keys.
- `api/.htaccess` blocks direct access to the config and log on Apache hosts.

## Setup

1. Copy `api/config.example.php` to `api/config.php` and paste the Public API Key and Bearer Token from your Offerwall.me placement credentials.
2. Upload the folder to any PHP host (PHP 7.4 or newer with curl).
3. In the Offerwall.me placement settings set the postback URL to `https://bumwallet.io/api/postback.php`.
4. Open `https://bumwallet.io/`, enter a user ID, pick a country, click Load offers.
5. Complete an offer and check `api/postbacks.log` for the incoming postback.

## Local test

    cp api/config.example.php api/config.php
    php -S localhost:8080

Then open http://localhost:8080. Local runs will report your private IP to Offerwall.me, so the offer list may differ from production.

## Next step

Replace `api/postback.php` with the real backend handler once the user and balance model is decided.
