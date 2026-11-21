
require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try { 
    // Database connection must succeed first.
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Smart School BD API: http://localhost:${PORT}`);
      console.log(`Health Check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown.
    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        try {
          const mongoose = require("mongoose");
          await mongoose.disconnect();
          process.exit(0);
        } catch (error) {
          console.error("Shutdown error:", error.message);
          process.exit(1);
        }
      });
    };

    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
