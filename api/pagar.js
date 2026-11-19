module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const body = req.body || {};
  const rawCard = body.cardNumber || body.card_number || body.card || '';
  const rawExp = body.expiration || body.cardExp || body.expiry || body.expirationDate || '';
  const rawCvc = body.cvc || body.cvv || body.securityCode || '';
  const rawAmount = body.amount || body.total || 100;
  const rawItbis = body.itbis || 0;
  const orderNum = body.orderId || body.orderNumber || `LCM-${Date.now()}`;

  const merchantId = process.env.AZUL_MERCHANT_ID;
  const authKey = process.env.AZUL_AUTH_KEY;
  const endpoint = process.env.AZUL_ENDPOINT_URL || 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';

  if (!merchantId || !authKey) {
    return res.status(500).json({ error: 'Faltan credenciales de Azul en las variables de Vercel' });
  }

  // 1. Limpiar número de tarjeta (solo dígitos)
  const cleanCard = String(rawCard).replace(/\D/g, '');

  // 2. Convertir fecha (MM/YY o MM/YYYY) al formato estricto AAAAMM que exige Azul
  let cleanExp = String(rawExp).replace(/\D/g, '');
  let formattedExp = cleanExp;
  if (cleanExp.length === 4) {
    const mm = cleanExp.substring(0, 2);
    const yy = cleanExp.substring(2, 4);
    formattedExp = '20' + yy + mm; // Ej: 1226 -> 202612
  } else if (cleanExp.length === 6 && parseInt(cleanExp.substring(0, 2), 10) <= 12) {
    const mm = cleanExp.substring(0, 2);
    const yyyy = cleanExp.substring(2, 6);
    formattedExp = yyyy + mm; // Ej: 122026 -> 202612
  }

  // 3. Monto en centavos (ej: 500 DOP -> 50000)
  const parsedAmount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, '')) || 100;
  const parsedItbis = parseFloat(String(rawItbis).replace(/[^0-9.]/g, '')) || 0;
  const amountCents = Math.round(parsedAmount * 100).toString();
  const itbisCents = Math.round(parsedItbis * 100).toString();

  const payload = {
    Channel: 'EC',
    Store: merchantId,
    CardNumber: cleanCard,
    Expiration: formattedExp,
    CVC: String(rawCvc).trim(),
    PosInputMode: 'E-Commerce',
    TrxType: 'Sale',
    Amount: amountCents,
    Itbis: itbisCents,
    Payments: '1',
    Plan: '0',
    AcquirerRefData: '1',
    CurrencyPosCode: '$',
    CustomOrderId: String(orderNum),
    OrderNumber: String(orderNum),
    ForceNo3DS: '1'
  };

  console.log('--- ENVIANDO TRANSACCIÓN A AZUL ---');
  console.log('PAYLOAD AZUL:', JSON.stringify(payload, null, 2));

  try {
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
    console.log('RESPUESTA RAW DE AZUL:', rawText);

    try {
      const data = JSON.parse(rawText);
      return res.status(200).json(data);
    } catch {
      return res.status(502).json({ error: 'Azul no respondió con JSON válido', raw: rawText });
    }
  } catch (error) {
    console.error('ERROR EN CONEXIÓN AZUL:', error);
    return res.status(500).json({ error: 'Error al conectar con Azul', detalle: error.message });
  }
};
