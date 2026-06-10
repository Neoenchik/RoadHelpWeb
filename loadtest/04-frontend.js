import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { WEB } from './config.js';

const errors = new Rate('errors');

export const options = {
  scenarios: {
    frontend: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '30s', target: 30 },
        { duration: '30s', target: 60 },
        { duration: '15s', target: 0 }
      ]
    }
  }
};

const pages = ['/', '/auth/login', '/become-executor'];

export default function () {
  const page = pages[__ITER % pages.length];
  const res = http.get(`${WEB}${page}`);
  const ok = check(res, { 'page 200': (r) => r.status === 200 });
  errors.add(!ok);
  sleep(0.3);
}
