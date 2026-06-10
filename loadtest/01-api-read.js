import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { API } from './config.js';

const errors = new Rate('errors');
const swaggerLatency = new Trend('swagger_latency', true);

export const options = {
  scenarios: {
    swagger_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 10 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.get(`${API}/swagger/v1/swagger.json`);
  swaggerLatency.add(res.timings.duration);
  const ok = check(res, { 'swagger 200': (r) => r.status === 200 });
  errors.add(!ok);
  sleep(0.1);
}
