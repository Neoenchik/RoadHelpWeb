import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, OTP } from './config.js';

export const options = {
  scenarios: {
    api_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '30s', target: 150 },
        { duration: '30s', target: 250 },
        { duration: '30s', target: 350 },
        { duration: '15s', target: 0 }
      ]
    }
  }
};

export function setup() {
  const phone = '+79000000003';
  const headers = { 'Content-Type': 'application/json' };
  http.post(`${API}/api/auth/send-otp`, JSON.stringify({ phone, purpose: 'login' }), { headers });
  const verify = http.post(
    `${API}/api/auth/verify-otp`,
    JSON.stringify({ phone, otp: OTP, purpose: 'login' }),
    { headers }
  );
  return { token: verify.json('access_token') };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };
  const r = http.get(`${API}/api/orders/history`, { headers, timeout: '10s' });
  check(r, { 'history 200': (x) => x.status === 200 });
  sleep(0.05);
}
