FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY shared ./shared
COPY services/analytics ./services/analytics
EXPOSE 3004
CMD ["npm", "run", "start:analytics"]
