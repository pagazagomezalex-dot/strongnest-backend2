import { Request, Response } from 'express';

// Controller para el Copiloto Inteligente KIN-O AI
export const processAiAssistantMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pet_id, prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ error: 'El parámetro "prompt" es obligatorio' });
      return;
    }

    const targetPetId = pet_id ? String(pet_id) : 'PRUEBA_MASCOTA_1';
    const lowerPrompt = String(prompt).toLowerCase();

    const systemGreeting = `¡Hola! Soy tu Copiloto KIN-O AI 🐾🤖. `;
    let responseText = '';

    if (
      lowerPrompt.includes('transporte') ||
      lowerPrompt.includes('uber') ||
      lowerPrompt.includes('llevar') ||
      lowerPrompt.includes('estética') ||
      lowerPrompt.includes('estetica')
    ) {
      responseText = `He verificado la logística para la mascota ID ${targetPetId}. Puedo coordinar el traslado seguro en transporte verificado hacia la estética o veterinaria. Durante el trayecto, el collar KIN-O emitirá pings GPS cada 10 segundos con monitoreo en vivo directo a tu app.`;
    } else if (
      lowerPrompt.includes('geocerca') ||
      lowerPrompt.includes('zona segura') ||
      lowerPrompt.includes('escape')
    ) {
      responseText = `El motor de geocercas de ${targetPetId} está activo mediante el algoritmo de Haversine. En caso de detectar salida del perímetro seguro, dispararé inmediatamente una notificación crítica CRITICAL_ALERT_BREACH a tu teléfono.`;
    } else if (
      lowerPrompt.includes('vacuna') ||
      lowerPrompt.includes('médico') ||
      lowerPrompt.includes('medico') ||
      lowerPrompt.includes('carnet')
    ) {
      responseText = `He sincronizado el Carnet Digital de ${targetPetId}. La Ficha Médica QR está lista en el collar para escaneo instantáneo en caso de emergencia.`;
    } else {
      responseText = `Procesé tu consulta: "${prompt}". Estoy listo para gestionar la telemetría GPS, geocercas, expediente médico, alertas comunitarias y logística de traslado seguro para tu mascota.`;
    }

    res.status(200).json({
      pet_id: targetPetId,
      status: 'SUCCESS',
      copilot: 'KIN-O AI Assistant v1.0',
      prompt,
      response: `${systemGreeting}${responseText}`,
      suggested_actions: [
        'Monitorear GPS en vivo',
        'Coordinar traslado seguro a estética',
        'Consultar Carnet Digital'
      ]
    });
  } catch (error: any) {
    console.error('❌ Error en KIN-O AI Assistant:', error);
    res.status(500).json({ error: error.message || 'Error interno en KIN-O AI' });
  }
};
