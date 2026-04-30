FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY shared ./shared
COPY services/saga ./services/saga
EXPOSE 3005
CMD ["npm", "run", "start:saga"]
