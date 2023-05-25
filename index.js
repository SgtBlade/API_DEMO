import "dotenv/config";
import express from "express";
import { registerMiddleware } from "./middleware/index.js";
import passport from "passport";
import  LocalStrategy from "./middleware/auth/LocalStrategy.js";
import JwtStrategy from "./middleware/auth/JwtStrategy.js";
import { registerRoutes } from "./routers/routers.js";

//Create an Express app:
const app = express();
const port = process.env.PORT;

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
  console.log(`App listening http://${process.env.APP_URL}:${port}`);
});

const closeServer = () => {
  server.close();
  // close the MongoDB client here if needed
  process.exit();
};

process.on("SIGINT", () => closeServer());
process.on("SIGTERM", () => closeServer());
