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
    return res.status(500).json({ error: 'Faltan credenciales de Azul en Vercel' });
  }

  // Convertir fecha (MM/YY o MM/YYYY) a formato AAAAMM que exige Azul (ej: 12/26 -> 202612)
  let cleanExp = (expiration || '').replace(/\D/g, '');
  let formattedExp = cleanExp;
  if (cleanExp.length === 4) {
    const mm = cleanExp.substring(0, 2);
    const yy = cleanExp.substring(2, 4);
    formattedExp = '20' + yy + mm;
  } else if (cleanExp.length === 6 && parseInt(cleanExp.substring(0, 2)) <= 12) {
    const mm = cleanExp.substring(0, 2);
    const yyyy = cleanExp.substring(2, 6);
    formattedExp = yyyy + mm;
  }

  try {
    const cleanCard = (cardNumber || '').replace(/\s+/g, '');
    const cleanCvc = (cvc || '').toString().trim();
    const orderNum = orderId || `LCM-${Date.now()}`;

    const payload = {
      Channel: 'EC',
      Store: merchantId,
      CardNumber: cleanCard,
      Expiration: formattedExp,
      CVC: cleanCvc,
      PosInputMode: 'E-Commerce',
      TrxType: 'Sale',
      Amount: Math.round(Number(amount || 0) * 100).toString(),
      Itbis: Math.round(Number(itbis || 0) * 100).toString(),
      Payments: '1',
      Plan: '0',
      AcquirerRefData: '1',
      CurrencyPosCode: '$',
      CustomOrderId: orderNum,
      OrderNumber: orderNum,
      ForceNo3DS: '1'
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
      return res.status(502).json({ error: 'Respuesta no JSON de Azul', detalle: rawText });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Fallo al procesar con Azul', detalle: error.message });
  }
};
