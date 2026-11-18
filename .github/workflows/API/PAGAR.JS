export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { cardNumber, expiration, cvc, amount, itbis, orderId } = req.body;

  const merchantId = process.env.AZUL_MERCHANT_ID;
  const authKey = process.env.AZUL_AUTH_KEY;
  const endpoint = process.env.AZUL_ENDPOINT_URL || 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';

  if (!merchantId || !authKey) {
    return res.status(500).json({ error: 'Faltan credenciales de Azul en las variables de Vercel' });
  }

  try {
    // Formato estándar esperado por el servicio JSON de Azul
    const payload = {
      Channel: 'EC',
      Store: merchantId,
      CardNumber: (cardNumber || '').replace(/\s+/g, ''),
      Expiration: (expiration || '').replace(/\D/g, ''),
      CVC: cvc,
      PosInputMode: 'E-Commerce',
      TrxType: 'Sale',
      Amount: Math.round(Number(amount) * 100).toString(),
      Itbis: Math.round(Number(itbis || 0) * 100).toString(),
      OrderNumber: orderId || `LCM-${Date.now()}`
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Auth1': merchantId,
        'Auth2': authKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Error al conectar con Azul', details: error.message });
  }
}
