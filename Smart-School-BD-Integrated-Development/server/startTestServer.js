
require("dotenv").config({ path: ".env.test" });

if (process.env.NODE_ENV !== "test") {
  throw new Error("Test server must run with NODE_ENV=test.");
}

require("../server/src/server");
