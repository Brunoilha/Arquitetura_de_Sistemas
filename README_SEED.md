Seed instructions

1. Start the stack:

```powershell
cd "c:\Users\José Arcangelo\Downloads\ArquiteturaDeSistemas-main (1)\ArquiteturaDeSistemas-main"
docker compose up --build
```

2. In another terminal, run the seed script (requires Node 18+):

```powershell
node scripts/seed.js
```

3. Watch logs to verify behavior (payments will be created by payment-service):

```powershell
docker logs payments_service -f
```

Notes:
- The seed script posts to `users_service` (3005), `products_service` (3006) and `orders_service` (3002). The order event is published to Kafka topic `pedidos` and consumed by the payment-service which will process the payment and update order status.
- If services are not running on localhost ports, adjust the URLs in `scripts/seed.js`.
