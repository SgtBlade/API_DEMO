import "dotenv/config";
import express from "express";

//Create an Express app:
const app = express();
const port = 3002;


//Start the server and handle server crashes:
const server = app.listen(port, () => {
  console.log(`App listening http://localhost:${port}`);
});

const closeServer = () => {
  server.close();
  // close the MongoDB client here if needed
  process.exit();
};

process.on("SIGINT", () => closeServer());
process.on("SIGTERM", () => closeServer());
