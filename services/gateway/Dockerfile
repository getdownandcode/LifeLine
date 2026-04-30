FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY shared ./shared
COPY services/gateway ./services/gateway
EXPOSE 3000
CMD ["npm", "run", "start:gateway"]
