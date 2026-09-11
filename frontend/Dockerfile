FROM node:20-alpine
WORKDIR /app

# Yarn導入
RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --immutable


COPY . .

EXPOSE 3000
CMD ["yarn", "dev"]
