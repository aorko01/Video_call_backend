import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));

// Let express know that JSON data is being sent to the server
app.use(express.json({ limit: "16kb" }));

// Let express know that URL encoded data is being sent to the server
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Let express know that static files are being sent to the server
app.use(express.static("public"));

// Let express know that cookies are being sent to the server
app.use(cookieParser());

import registrationRouter from './routes/user.router.js'; // Adjust the path as necessary

// Use the registration router
app.use('/api/v1/user', registrationRouter); // Prefix all routes in registrationRouter with /api

app.get('/test', (req, res) => {
    res.json({ message: "Route is working!" });
});

export default app;
