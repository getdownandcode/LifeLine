FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY shared ./shared
COPY services/inventory ./services/inventory
COPY services/matching/src/utils ./services/matching/src/utils
EXPOSE 3002
CMD ["npm", "run", "start:inventory"]
