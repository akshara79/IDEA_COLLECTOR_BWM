FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm fetch

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm build

EXPOSE 4000
CMD ["pnpm", "start"]