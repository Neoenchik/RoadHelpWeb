import http from 'k6/http';

export const API = __ENV.API_URL || 'http://host.docker.internal:8080';
export const WEB = __ENV.WEB_URL || 'http://host.docker.internal:3000';
export const OTP = __ENV.OTP_CODE || '1234';

export function uniquePhone(vu) {
  const n = String(79010000000 + vu).slice(0, 12);
  return `+${n}`;
}

export function loginAsUser(vu) {
  const phone = uniquePhone(vu);
  const headers = { 'Content-Type': 'application/json' };

  const send = http.post(`${API}/api/auth/send-otp`, JSON.stringify({ phone, purpose: 'login' }), { headers });
  if (send.status !== 200) return null;

  const verify = http.post(
    `${API}/api/auth/verify-otp`,
    JSON.stringify({ phone, otp: OTP, purpose: 'login', role: 'USER' }),
    { headers },
  );
  if (verify.status !== 200) return null;

  return verify.json('access_token');
}
