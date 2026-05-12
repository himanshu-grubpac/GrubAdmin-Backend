#!/bin/sh
set -e

echo "Checking database availability..."
node -e '
const net = require("net");
const host = "mysql";
const port = 3306;
let attempts = 0;

function connect() {
  attempts++;
  const socket = new net.Socket();
  socket.setTimeout(1500);

  socket.on("connect", () => {
    console.log("✅ Database (MySQL) is ready and accepting connections!");
    socket.destroy();
    process.exit(0);
  });

  const handleError = () => {
    socket.destroy();
    if (attempts >= 30) {
      console.error("❌ Database connection timeout! Exiting...");
      process.exit(1);
    }
    console.log(`⏳ Waiting for database (MySQL) to start (attempt ${attempts}/30)...`);
    setTimeout(connect, 2000);
  };

  socket.on("error", handleError);
  socket.on("timeout", handleError);

  socket.connect(port, host);
}

connect();
'

echo "🚀 Running database schema push..."
bun db:push

echo "📦 Generating Prisma Client..."
bun db:generate

echo "🔥 Starting GrubAdmin-Backend application..."
exec bun start