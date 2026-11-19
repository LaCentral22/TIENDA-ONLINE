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
      return res.status(500).json({ error: 'Falta configurar AZUL_AUTH_KEY en las variables de entorno' });
    }

    const { amount, itbis } = req.body || {};
    const rawAmount = parseFloat(amount) || 100;
    const amountInCents = Math.round(rawAmount * 100).toString();

    // Azul exige '000' para 0.00
    let itbisInCents = '000';
    if (itbis && parseFloat(itbis) > 0) {
      itbisInCents = Math.round(parseFloat(itbis) * 100).toString();
    }

    const orderId = 'LCM-' + Date.now();

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const storeUrl = `${protocol}://${host}`;

    // Campos en orden estricto de Azul
    const params = {
      MerchantId: merchantId,
      MerchantName: 'La Central Moda',
      MerchantType: 'ecommerce',
      CurrencyCode: '$',
      OrderNumber: orderId,
      Amount: amountInCents,
      ITBIS: itbisInCents,
      ApprovedUrl: storeUrl,
      DeclinedUrl: storeUrl,
      CancelUrl: storeUrl,
      UseCustomField1: '0',
      CustomField1Label: '',
      CustomField1Value: '',
      UseCustomField2: '0',
      CustomField2Label: '',
      CustomField2Value: ''
    };

    // La cadena une los 16 campos + AuthKey al final
    const plainText = Object.values(params).join('') + privateKey;

    // HMAC-SHA512 con clave AuthKey y codificación UTF-16LE requerida por Azul
    const authHash = crypto
      .createHmac('sha512', privateKey)
      .update(Buffer.from(plainText, 'utf16le'))
      .digest('hex');

    const formParams = {
      ...params,
      ShowTransactionResult: '0',
      AuthHash: authHash
    };

    // Si tus credenciales son de producción, usa: https://pagos.azul.com.do/paymentpage/default.aspx
    // Si son de sandbox/pruebas, usa: https://pruebas.azul.com.do/PaymentPage/default.aspx
    const azulUrl = process.env.AZUL_ENV === 'production'
      ? 'https://pagos.azul.com.do/paymentpage/default.aspx'
      : 'https://pruebas.azul.com.do/PaymentPage/default.aspx';

    return res.status(200).json({
      url: azulUrl,
      params: formParams
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error interno: ' + err.message });
  }
};
