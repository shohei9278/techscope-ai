FROM --platform=linux/amd64 node:20-slim
WORKDIR /app

# Yarn導入
RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --immutable


COPY . .

EXPOSE 3000
CMD ["yarn", "dev"]
