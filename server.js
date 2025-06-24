const Fastify = require('fastify');
const fastifyMultipart = require('@fastify/multipart');
const fetch = require('node-fetch');
const fs = require('fs');
const { exec } = require('child_process');

const fastify = Fastify({ logger: true });
fastify.register(fastifyMultipart);

fastify.post('/render', async function (req, reply) {
  const parts = await req.parts();

  let audioFile;
  let bgUrl;

  for await (const part of parts) {
    if (part.type === 'file' && part.fieldname === 'audio') {
      const filePath = `/tmp/${Date.now()}-${part.filename}`;
      await pump(part.file, fs.createWriteStream(filePath));
      audioFile = filePath;
    } else if (part.fieldname === 'bgUrl') {
      bgUrl = part.value;
    }
  }

  if (!audioFile || !bgUrl) {
    return reply.code(400).send({ error: 'Missing audio or bgUrl' });
  }

  const bgPath = audioFile + '.jpg';
  const outMp4 = audioFile + '.mp4';

  const res = await fetch(bgUrl);
  const stream = fs.createWriteStream(bgPath);
  res.body.pipe(stream);
  await new Promise((r) => stream.on('finish', r));

  const cmd = `ffmpeg -loop 1 -i ${bgPath} -i ${audioFile} -c:v libx264 -c:a aac -shortest -vf scale=1080:1920 ${outMp4}`;
  exec(cmd, (err) => {
    if (err) return reply.code(500).send('FFmpeg error');

    reply.header('Content-Disposition', 'attachment; filename=video.mp4');
    reply.send(fs.createReadStream(outMp4));

    setTimeout(() => {
      fs.unlinkSync(audioFile);
      fs.unlinkSync(bgPath);
      fs.unlinkSync(outMp4);
    }, 10000);
  });
});

fastify.get('/', async (req, reply) => {
  reply.send('🎬 FFmpeg Fastify server is running!');
});

fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });

function pump (source, destination) {
  return new Promise((resolve, reject) => {
    source.pipe(destination);
    source.on('end', resolve);
    source.on('error', reject);
  });
}
