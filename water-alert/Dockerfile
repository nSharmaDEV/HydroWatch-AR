FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8788 WATER_ALERT_DATA_DIR=/app/data/live
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev && mkdir -p /app/data/live && chown -R node:node /app/data
COPY --from=build /app/server ./server
COPY --from=build /app/src/domain.ts ./src/domain.ts
COPY --from=build /app/dist ./dist
USER node
EXPOSE 8788
CMD ["npm", "start"]
