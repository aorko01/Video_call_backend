import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }))

  //the line below is used to let express know that json data is being sent to the server 
app.use(express.json({limit :"16kb"}));

//the line below is used to let express know that url encoded data is being sent to the server which is mostly known as params
app.use(express.urlencoded({extended: true, limit: "16kb"}));

//the line below is used to let express know that static files are being sent to the server (don't know much about this yet)
app.use(express.static("public"));
// the line below is used to let express know that cookies are being sent to the server
app.use(cookieParser());



export default app;
