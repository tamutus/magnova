FROM node:18 AS build-stage
RUN mkdir /build
WORKDIR /build
COPY . ./
RUN npm ci
RUN npm run build

FROM node:18
RUN mkdir /app
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production
COPY --from=build-stage /build/dist ./
CMD ["npm", "run", "docker-start"]

