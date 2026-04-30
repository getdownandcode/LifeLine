FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY shared ./shared
COPY services/notification ./services/notification
EXPOSE 3003
CMD ["npm", "run", "start:notification"]
