const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// Middleware
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://job-portal-cd467.web.app",
            "https://job-portal-cd467.firebaseapp.com",
        ],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());



app.get("/", (req, res) => {
    res.send("Job Portal is running...");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
