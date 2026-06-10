import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, WEB, OTP } from './config.js';

export const options = {
  scenarios: {
    prod_suite: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 10 },
        { duration: '40s', target: 30 },
        { duration: '40s', target: 50 },
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
    { headers }
  );
  return { token: verify.json('access_token') };
}

export default function (data) {
  const roll = Math.random();
  const apiHeaders = { Authorization: `Bearer ${data.token}` };

  if (roll < 0.35) {
    const r = http.get(`${API}/api/orders/history`, { headers: apiHeaders, timeout: '15s' });
    check(r, { history: (x) => x.status === 200 });
  } else if (roll < 0.55) {
    const r = http.get(`${API}/api/orders/active`, { headers: apiHeaders, timeout: '15s' });
    check(r, { active: (x) => x.status === 200 || x.status === 204 });
  } else {
    const r = http.get(`${WEB}/`, { timeout: '15s' });
    check(r, { home: (x) => x.status === 200 });
  }
  sleep(0.15);
}
