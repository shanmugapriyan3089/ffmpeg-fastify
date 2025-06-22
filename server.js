const Fastify = require('fastify');
const multer = require('fastify-multer');
const fetch = require('node-fetch');
const fs = require('fs');
const { exec } = require('child_process');

const fastify = Fastify({ logger: true });
fastify.register(multer.contentParser);
const upload = multer({ dest: '/tmp/' });

fastify.post('/render', { preHandler: upload.single('audio') }, async (req, reply) => {
  try {
    const bgUrl = req.body.bgUrl;
    const inMp3 = req.file.path;
    const outMp4 = inMp3 + '.mp4';

    const response = await fetch(bgUrl);
    const bgPath = inMp3 + '.jpg';
    const stream = fs.createWriteStream(bgPath);
    response.body.pipe(stream);
    await new Promise(r => stream.on('finish', r));

    const cmd = `ffmpeg -loop 1 -i ${bgPath} -i ${inMp3} -c:v libx264 -c:a aac -shortest -vf scale=1080:1920 ${outMp4}`;
    exec(cmd, (err) => {
      if (err) return reply.code(500).send('FFmpeg error');

      reply.header('Content-Disposition', 'attachment; filename=video.mp4');
      reply.send(fs.createReadStream(outMp4));

      // Cleanup
      setTimeout(() => {
        fs.unlinkSync(inMp3);
        fs.unlinkSync(bgPath);
        fs.unlinkSync(outMp4);
      }, 10000);
    });
  } catch (err) {
    reply.code(500).send('Error: ' + err.message);
  }
});

fastify.get('/', async (req, reply) => {
  reply.send('🎬 FFmpeg Fastify server is running!');
});

fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
