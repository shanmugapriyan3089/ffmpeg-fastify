FROM node:18gh repo create ffmpeg-fastify --public --source=. --remote=origin

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app
COPY . .
RUN npm install

EXPOSE 3000
CMD ["npm", "start"]
