const Fastify = require('fastify');
const multer = require('multer');
const fetch = require('node-fetch');
const fs = require('fs');
const { exec } = require('child_process');

// Create Fastify app
const fastify = Fastify({ logger: true });

// Setup Multer to handle file uploads
const upload = multer({ dest: '/tmp/' });

// Route: POST /render
fastify.post('/render', { preHandler: upload.single('audio') }, async (req, reply) => {
  try {
    const bgUrl = req.body.bgUrl;
    const inMp3 = req.file.path;
    const outMp4 = inMp3 + '.mp4';

    // Download background image
    const response = await fetch(bgUrl);
    const bgPath = inMp3 + '.jpg';
    const stream = fs.createWriteStream(bgPath);
    response.body.pipe(stream);
    await new Promise(resolve => stream.on('finish', resolve));

    // FFmpeg command to create vertical video
    const cmd = `ffmpeg -loop 1 -i ${bgPath} -i ${inMp3} -c:v libx264 -c:a aac -b:a 192k -shortest -vf scale=1080:1920 ${outMp4}`;

    exec(cmd, (err) => {
      if (err) {
        console.error('FFmpeg Error:', err);
        return reply.code(500).send('FFmpeg error');
      }

      reply.header('Content-Disposition', 'attachment; filename=video.mp4');
      reply.send(fs.createReadStream(outMp4));

      // Cleanup files after sending
      setTimeout(() => {
        fs.unlinkSync(inMp3);
        fs.unlinkSync(bgPath);
        fs.unlinkSync(outMp4);
      }, 10000);
    });
  } catch (err) {
    console.error('Server Error:', err);
    reply.code(500).send('Error: ' + err.message);
  }
});

// Route: GET /
fastify.get('/', async (req, reply) => {
  reply.send('🎬 FFmpeg Fastify server is running!');
});

// Start the server
fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
