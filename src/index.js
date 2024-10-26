import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

// Define the port from environment or default to 3000
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
