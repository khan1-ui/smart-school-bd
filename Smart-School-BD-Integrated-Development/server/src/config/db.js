
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI; 

    if (!uri) {
      throw new Error("MONGODB_URI is missing.");
    }

    // Extra safety guard for the dedicated test server.
    if (process.env.NODE_ENV === "test") {
      let parsedUri;

      try {
        parsedUri = new URL(uri);
      } catch {
        throw new Error("Invalid MongoDB URI.");
      }

      const databaseName = parsedUri.pathname.replace(/^\/+/, "");

      if (
        databaseName !== "smart_school_bd_test" ||
        parsedUri.searchParams.get("replicaSet") !== "rs0"
      ) {
        throw new Error(
          "Test mode only permits smart_school_bd_test with replicaSet=rs0."
        );
      }
    }

    const connection = await mongoose.connect(uri);

    console.log(
      `MongoDB Connected: ${connection.connection.host}`
    );
    console.log(
      `Database Name: ${connection.connection.name}`
    );

    // Verify the actual database after connecting, too.
    if (
      process.env.NODE_ENV === "test" &&
      mongoose.connection.name !== "smart_school_bd_test"
    ) {
      await mongoose.disconnect();

      throw new Error(
        "Connected to an unexpected database. Test server stopped."
      );
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDB;
