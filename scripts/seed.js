// Seed script to create users, products and a sample order (end-to-end).
// Uses built-in fetch (Node 18+) to call service endpoints running on localhost.

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}

async function main() {
  console.log('Starting seed...');
  try {
    // Create a user
    const user = await post('http://localhost:3005/users', { name: 'Seed User', email: 'seed@example.com' });
    console.log('Created user:', user);

    // Create products
    const p1 = await post('http://localhost:3006/products', { name: 'Product A', price: 10.5, stock: 100 });
    const p2 = await post('http://localhost:3006/products', { name: 'Product B', price: 25.0, stock: 50 });
    console.log('Created products:', p1, p2);

    // Create an order (orders-service will produce to Kafka 'pedidos')
    const orderPayload = {
      userId: user.id,
      products: [
        { productId: p1.id, quantity: 2, price: p1.price },
        { productId: p2.id, quantity: 1, price: p2.price }
      ],
      paymentMethod: 'credit_card'
    };

    const order = await post('http://localhost:3002/orders', orderPayload);
    console.log('Created order:', order);
      // Espera o pagamento ser processado pelo payment-service
      const orderId = order._id || order.id || order;
      console.log('Aguardando processamento do pagamento para orderId=', orderId);

      async function waitForPayment(orderId, attempts = 20, delayMs = 1000) {
        for (let i = 0; i < attempts; i++) {
          try {
            const res = await fetch(`http://localhost:3007/payments?order_id=${orderId}`);
            if (res.status === 200) {
              const payment = await res.json();
              return payment;
            }
          } catch (err) {
            // ignora e tenta novamente
          }
          await new Promise(r => setTimeout(r, delayMs));
        }
        throw new Error('Timeout waiting for payment');
      }

      try {
        const payment = await waitForPayment(orderId);
        console.log('Pagamento criado automaticamente pelo payment-service:', payment);
      } catch (err) {
        console.warn('Pagamento não encontrado dentro do timeout. Cheque logs do payment-service.');
      }

      console.log('Seed finished.');
  } catch (err) {
    console.error('Seed failed:', err);
  }
}

main();
