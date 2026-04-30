FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY shared ./shared
COPY services/matching ./services/matching
EXPOSE 3001
CMD ["npm", "run", "start:matching"]
