FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY src ./src
COPY README.md ./README.md

ENV NODE_ENV=production
ENV PLAYWRIGHT_DISABLE_SANDBOX=true

EXPOSE 3000

CMD ["npm", "start"]
