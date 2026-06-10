import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { API, OTP } from './config.js';

const errors = new Rate('errors');

export const options = {
  scenarios: {
    auth_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '40s', target: 50 },
        { duration: '40s', target: 100 },
        { duration: '20s', target: 0 }
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
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  const active = http.get(`${API}/api/orders/active`, { headers });
  const history = http.get(`${API}/api/orders/history`, { headers });

  const okActive = check(active, { 'active ok': (r) => r.status === 200 || r.status === 204 || r.status === 404 });
  const okHistory = check(history, { 'history ok': (r) => r.status === 200 });
  errors.add(!(okActive && okHistory));
  sleep(0.2);
}
