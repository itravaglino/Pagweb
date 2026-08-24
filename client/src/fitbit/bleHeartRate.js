import { HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT, parseHeartRateMeasurement } from '@shared/fitbit-os/heart-rate.js';

export function canUseWebBluetooth() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
}

/**
 * Connects a BLE Heart Rate Monitor using the same GATT service Fitbit uses (0x180D).
 */
export async function connectBleHeartRate({ onBpm, onStatus } = {}) {
  if (!canUseWebBluetooth()) {
    throw new Error('Web Bluetooth no está disponible');
  }
  onStatus?.('Elige un pulsómetro BLE…');
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [HEART_RATE_SERVICE] }],
    optionalServices: [HEART_RATE_SERVICE],
  });
  onStatus?.(`Conectando ${device.name || 'HRM'}…`);
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(HEART_RATE_SERVICE);
  const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);
  await characteristic.startNotifications();
  const onChange = (event) => {
    const value = event.target.value;
    if (!value) return;
    onBpm?.(parseHeartRateMeasurement(value));
  };
  characteristic.addEventListener('characteristicvaluechanged', onChange);
  onStatus?.(`HRM BLE: ${device.name || 'conectado'}`);
  return {
    device,
    async disconnect() {
      characteristic.removeEventListener('characteristicvaluechanged', onChange);
      device.gatt?.disconnect();
    },
  };
}
