FROM node:16-alpine

WORKDIR /app

COPY package*.json ./

RUN apk update && apk add npm && npm ci

COPY . .

ENV PORT=3333

EXPOSE $PORT

CMD ["npm", "start"]
