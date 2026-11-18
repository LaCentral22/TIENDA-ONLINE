module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { cardNumber, expiration, cvc, amount, itbis, orderId } = req.body || {};
  const merchantId = process.env.AZUL_MERCHANT_ID;
  const authKey = process.env.AZUL_AUTH_KEY;
  const endpoint = process.env.AZUL_ENDPOINT_URL || 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';

  if (!merchantId || !authKey) {
    return res.status(500).json({ 
      error: 'Faltan credenciales en Vercel',
      merchantId: merchantId ? 'OK' : 'FALTA',
      authKey: authKey ? 'OK' : 'FALTA'
    });
  }

  try {
    const payload = {
      Channel: 'EC',
      Store: merchantId,
      CardNumber: (cardNumber || '').replace(/\s+/g, ''),
      Expiration: (expiration || '').replace(/\D/g, ''),
      CVC: cvc,
      PosInputMode: 'E-Commerce',
      TrxType: 'Sale',
      Amount: Math.round(Number(amount || 0) * 100).toString(),
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

    const rawText = await response.text();
    try {
      const data = JSON.parse(rawText);
      return res.status(200).json(data);
    } catch {
      return res.status(502).json({ error: 'Azul respondió sin formato JSON', detalle: rawText });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Fallo al conectar con Azul', detalle: error.message });
  }
};
