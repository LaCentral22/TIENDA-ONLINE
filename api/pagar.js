module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método no permitido' });

  const body = req.body || {};

  // 1. Leer los campos exactamente como los envía tu index.html
  const rawCard = body.tarjeta || body.cardNumber || '';
  const rawExp = body.expiracion || body.expiration || '';
  const rawCvc = body.cvv || body.cvc || '';
  const rawAmount = body.montoDOP || body.amount || 100;
  const orderNum = `LCM-${Date.now()}`;

  const merchantId = String(process.env.AZUL_MERCHANT_ID || '').trim();
  const authKey = String(process.env.AZUL_AUTH_KEY || '').trim();
  const endpoint = process.env.AZUL_ENDPOINT_URL || 'https://pruebas.azul.com.do/webservices/JSON/Default.aspx';

  if (!merchantId || !authKey) {
    return res.status(500).json({ 
      success: false, 
      message: 'Faltan credenciales de Azul en Vercel (AZUL_MERCHANT_ID o AZUL_AUTH_KEY)' 
    });
  }

  // 2. Extraer solo los números de la tarjeta
  const cleanCard = String(rawCard).replace(/\D/g, '');

  // 3. Convertir fecha (ej. 12/28) al formato AAAAMM que exige Azul (202812)
  let cleanExp = String(rawExp).replace(/\D/g, '');
  let formattedExp = cleanExp;
  if (cleanExp.length === 4) {
    const mm = cleanExp.substring(0, 2);
    const yy = cleanExp.substring(2, 4);
    formattedExp = '20' + yy + mm;
  } else if (cleanExp.length === 6 && parseInt(cleanExp.substring(0, 2), 10) <= 12) {
    const mm = cleanExp.substring(0, 2);
    const yyyy = cleanExp.substring(2, 6);
    formattedExp = yyyy + mm;
  }

  // 4. Convertir monto a centavos para Azul (ej: 2450 DOP -> 245000)
  const parsedAmount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, '')) || 100;
  const amountCents = Math.round(parsedAmount * 100).toString();

  const payload = {
    Channel: 'EC',
    Store: merchantId,
    CardNumber: cleanCard,
    Expiration: formattedExp,
    CVC: String(rawCvc).trim(),
    PosInputMode: 'E-Commerce',
    TrxType: 'Sale',
    Amount: amountCents,
    Itbis: '0',
    Payments: '1',
    Plan: '0',
    AcquirerRefData: '1',
    CurrencyPosCode: '$',
    CustomOrderId: orderNum,
    OrderNumber: orderNum,
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

    let azulData = {};
    try {
      azulData = JSON.parse(rawText);
    } catch {
      return res.status(502).json({ 
        success: false, 
        message: 'Respuesta inválida de Azul: ' + rawText 
      });
    }

    // Comprobar aprobación: IsoCode '00' o ResponseMessage 'APROBADA'
    const isApproved = (azulData.IsoCode === '00' || azulData.ResponseCode === '00' || azulData.ResponseMessage === 'APROBADA');

    return res.status(200).json({
      success: isApproved,
      orderNumber: azulData.OrderNumber || azulData.CustomOrderId || orderNum,
      authorizationCode: azulData.AuthorizationCode || '',
      message: azulData.ResponseMessage || azulData.ErrorDescription || (isApproved ? 'Pago Aprobado' : 'Transacción declinada')
    });
  } catch (error) {
    console.error('ERROR CONEXIÓN AZUL:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Fallo de conexión con Azul: ' + error.message 
    });
  }
};
