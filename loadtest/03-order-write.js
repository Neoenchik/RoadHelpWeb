import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { API, OTP } from './config.js';

const errors = new Rate('errors');

export const options = {
  scenarios: {
    order_create: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 5 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 40 },
        { duration: '15s', target: 0 }
      ]
    }
  }
};

function phoneForVu(vu) {
  return `+7902${String(vu).padStart(7, '0')}`;
}

export function setup() {
  const tokens = {};
  for (let vu = 1; vu <= 40; vu++) {
    const phone = phoneForVu(vu);
    const headers = { 'Content-Type': 'application/json' };
    http.post(`${API}/api/auth/send-otp`, JSON.stringify({ phone, purpose: 'login' }), { headers });
    const verify = http.post(
      `${API}/api/auth/verify-otp`,
      JSON.stringify({ phone, otp: OTP, purpose: 'login', role: 'USER' }),
      { headers },
    );
    if (verify.status === 200) tokens[vu] = verify.json('access_token');
  }
  return { tokens };
}

export default function (data) {
  const token = data.tokens[__VU];
  if (!token) {
    errors.add(1);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const body = JSON.stringify({
    lat: 55.7558 + Math.random() * 0.01,
    lng: 37.6173 + Math.random() * 0.01,
    address: `Load test ${__VU}-${__ITER}`,
    service_type: 'tow',
    description: 'loadtest',
  });

  const create = http.post(`${API}/api/orders`, body, { headers });
  const ok = check(create, { 'order created': (r) => r.status === 200 || r.status === 201 });

  if (ok && create.status === 200) {
    const orderId = create.json('id') || create.json('orderId');
    if (orderId) {
      http.post(
        `${API}/api/orders/${orderId}/cancel`,
        JSON.stringify({ reason: 'loadtest cleanup' }),
        { headers },
      );
    }
  }

  errors.add(!ok);
  sleep(0.5);
}
