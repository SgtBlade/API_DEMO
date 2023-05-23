import "dotenv/config";
import express from "express";
import { ObjectId } from "mongodb";
import { initClient } from "./db/mongo.js";
import { registerMiddleware } from "./middleware/index.js";
import passport from "passport";
import  LocalStrategy from "./middleware/auth/LocalStrategy.js";
import JwtStrategy from "./middleware/auth/JwtStrategy.js";
import jwt from "jsonwebtoken";
import { registerRoutes } from "./routers/routers.js";

//Create an Express app:
const app = express();
const port = 3002;

//Register middleware:
registerMiddleware(app);

//Initialize MongoDB client and database:
app.use(passport.initialize());
// Use LocalStrategy to verify the user credentials locally
passport.use("local", LocalStrategy);

// Use JwtStrategy to verify the user credentials with a JWT token
passport.use("jwt", JwtStrategy);

registerRoutes(app)

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