const crypto = require('crypto');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const merchantId = (process.env.AZUL_MERCHANT_ID || '39038540035').trim();
    const privateKey = (process.env.AZUL_AUTH_KEY || '').trim();

    if (!privateKey) {
      return res.status(500).json({ error: 'Falta configurar AZUL_AUTH_KEY en Vercel' });
    }

    const { amount } = req.body || {};
    const rawAmount = parseFloat(amount) || 100;
    const amountInCents = Math.round(rawAmount * 100).toString();
    const orderId = 'LCM-' + Date.now();

    // Detectar el dominio de tu tienda para las URLs de retorno
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const storeUrl = `${protocol}://${host}`;

    const params = {
      MerchantId: merchantId,
      MerchantName: 'La Central Moda',
      MerchantType: 'ecommerce',
      CurrencyCode: '$',
      OrderNumber: orderId,
      Amount: amountInCents,
      ITBIS: '0',
      ApprovedUrl: storeUrl,
      DeclinedUrl: storeUrl,
      CancelUrl: storeUrl,
      ResponsePostUrl: storeUrl,
      UseCustomField1: '0',
      CustomField1Label: 'Custom1',
      CustomField1Value: 'Value1',
      UseCustomField2: '0',
      CustomField2Label: 'Custom2',
      CustomField2Value: 'Value2'
    };

    // Concatenación en orden exacto exigido por Azul + Llave Privada
    const plainText = Object.values(params).join('') + privateKey;
    const authHash = crypto
      .createHash('sha512')
      .update(Buffer.from(plainText, 'utf16le'))
      .digest('hex');

    const formParams = {
      ...params,
      ShowTransactionResult: '0',
      AuthHash: authHash
    };

    return res.status(200).json({
      url: 'https://pruebas.azul.com.do/PaymentPage/default.aspx',
      params: formParams
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
};
