FROM node:20-alpine
WORKDIR /app

RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --immutable

COPY . .

EXPOSE 4000
CMD ["yarn", "start:dev"]
