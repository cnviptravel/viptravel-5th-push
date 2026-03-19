
import https from 'https';

const data = JSON.stringify({
  text: 'Hello',
  sourceLang: 'English',
  targetLang: 'Mongolian'
});

const options = {
  hostname: 'viptravel-backend.erdneebatulzii23.workers.dev',
  port: 443,
  path: '/translate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);

  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
