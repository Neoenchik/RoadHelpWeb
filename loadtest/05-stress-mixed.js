import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { API, WEB, OTP } from './config.js';

const errors = new Rate('errors');

export const options = {
  scenarios: {
    mixed_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '30s', target: 80 },
        { duration: '30s', target: 150 },
        { duration: '30s', target: 200 },
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
    { headers },
  );
  return { token: verify.json('access_token') };
}

export default function (data) {
  const roll = Math.random();
  const apiHeaders = { Authorization: `Bearer ${data.token}` };

  let ok = true;
  if (roll < 0.4) {
    const r = http.get(`${API}/api/orders/history`, { headers: apiHeaders });
    ok = check(r, { 'history': (x) => x.status === 200 });
  } else if (roll < 0.7) {
    const r = http.get(`${API}/swagger/v1/swagger.json`);
    ok = check(r, { 'swagger': (x) => x.status === 200 });
  } else if (roll < 0.9) {
    const r = http.get(`${WEB}/`);
    ok = check(r, { 'home': (x) => x.status === 200 });
  } else {
    const r = http.get(`${API}/api/operator/metrics`, { headers: apiHeaders });
    ok = check(r, { 'metrics': (x) => x.status === 200 || x.status === 403 });
  }

  errors.add(!ok);
  sleep(0.1);
}
