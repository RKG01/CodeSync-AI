FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code
COPY . .

# Expose API + Yjs WebSocket ports
EXPOSE 4000 1234

# Start the server
CMD ["npm", "run", "dev"]
