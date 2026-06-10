import http from 'k6/http';
import { check, sleep } from 'k6';
import { API, OTP } from './config.js';

export const options = {
  scenarios: {
    otp_stress: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 100,
      maxVUs: 200
    }
  }
};

export default function () {
  const phone = `+7903${String(__VU).padStart(7, '0')}`;
  const headers = { 'Content-Type': 'application/json' };

  const send = http.post(
    `${API}/api/auth/send-otp`,
    JSON.stringify({ phone, purpose: 'login' }),
    { headers, timeout: '10s' }
  );

  if (send.status !== 200) {
    sleep(0.1);
    return;
  }

  const verify = http.post(
    `${API}/api/auth/verify-otp`,
    JSON.stringify({ phone, otp: OTP, purpose: 'login', role: 'USER' }),
    { headers, timeout: '10s' }
  );

  check(verify, { 'login ok': (r) => r.status === 200 });
  sleep(0.1);
}
