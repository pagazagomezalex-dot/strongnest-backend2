const http = require('http');

const SIMULATED_IMEI = "SN-PET-001"; // IMEI asignado a Max 🐾
let currentLat = 19.432608; // Coordenada inicial (CDMX / Condesa)
let currentLng = -99.133209;

console.log("🚀 Simulador GPS StrongNest Pets activado...");
console.log(`🐕 Transmitiendo telemetría en vivo para IMEI: ${SIMULATED_IMEI}\n`);

setInterval(() => {
    // Variación aleatoria para simular caminata en vivo
    currentLat += (Math.random() - 0.5) * 0.0003;
    currentLng += (Math.random() - 0.5) * 0.0003;
    const battery = Math.floor(Math.random() * (98 - 85 + 1)) + 85;
    const speed = (Math.random() * 3.5).toFixed(1);

    const pingPayload = JSON.stringify({
        imei: SIMULATED_IMEI,
        latitude: parseFloat(currentLat.toFixed(6)),
        longitude: parseFloat(currentLng.toFixed(6)),
        positioning_mode: "GPS",
        battery_level: battery,
        speed_kmh: parseFloat(speed)
    });

    const req = http.request({
        hostname: 'localhost',
        port: 4000,
        path: '/api/telemetry/ping',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(pingPayload)
        }
    }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log(`📡 Ping enviado -> Lat: ${currentLat.toFixed(6)}, Lng: ${currentLng.toFixed(6)}, Batería: ${battery}%, Velocidad: ${speed} km/h`);
        });
    });

    req.on('error', (e) => {
        console.error(`⚠️ Servidor no detectado en puerto 4000 (${e.message}). Revisa Terminal 1.`);
    });

    req.write(pingPayload);
    req.end();

}, 5000); // Envía pings cada 5 segundos