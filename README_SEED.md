Seed instructions (updated)

1. Start the stack (from the repo root):

```powershell
cd "c:\Users\bruno\Downloads\ArquiteturaDeSistemas-main\ArquiteturaDeSistemas-main"
docker-compose up --build
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
- The seed script posts to `users_service` (3005), `products_service` (3006) and `orders_service` (3002). The orders service now publishes Kafka events to the topic `order.created` and the payments service consumes that topic, processes the payment and publishes a result to `payment.processed` which the orders service consumes to update order status.
- The seed now polls the payments service `/payments?order_id=<id>` to confirm the payment record was created.
- If services are not running on localhost ports, adjust the URLs in `scripts/seed.js` or run the seed inside a container that can reach the services by service name.
