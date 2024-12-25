const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
    cors({
        origin: [
            "http://localhost:5173",
            "https://marathon-event.web.app",
            "https://marathon-event.firebaseapp.com",
        ],
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fh7he.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );

        const marathonCollection = client
            .db("marathonDB")
            .collection("marathons");

        const registrationCollection = client
            .db("marathonDB")
            .collection("registrations");

        const marathonTipsCollection = client
            .db("marathonDB")
            .collection("marathonTips");

        /**
         * API Endpoints
         */

        /**
         *
         * marathon apis
         *
         */
        // GET all marathons with optional limit and sorting
        app.get("/marathons", async (req, res) => {
            const limit = parseInt(req.query.limit) || 0; // Default to no limit if not specified
            const sortOrder = req.query.sort === "asc" ? 1 : -1; // Default to descending order if not specified

            const cursor = marathonCollection
                .find()
                .sort({ createdAt: sortOrder })
                .limit(limit);
            const events = await cursor.toArray();
            res.send(events);
        });

        // Get six randomly selected upcoming marathons
        app.get("/upcoming-marathons", async (req, res) => {
            const currentDate = new Date();
            const formattedDate = currentDate.toISOString().split("T")[0]; // Convert current date to "YYYY-MM-DD" format

            const cursor = marathonCollection.aggregate([
                { $match: { startRegistrationDate: { $gte: formattedDate } } },
                { $sample: { size: 6 } },
            ]);

            const events = await cursor.toArray();
            res.json(events);
        });

        // GET marathon by id
        app.get("/marathons/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const event = await marathonCollection.findOne(query);
            res.send(event);
        });

        // DELETE marathon by id
        app.delete("/marathons/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await marathonCollection.deleteOne(query);
            res.send(result);
        });

        // UPDATE marathon by id
        app.patch("/marathons/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedEvent = req.body;
            const newValues = { $set: updatedEvent };
            const result = await marathonCollection.updateOne(query, newValues);
            res.send(result);
        });

        // POST a new marathon
        app.post("/marathons", async (req, res) => {
            const newEvent = req.body;
            const result = await marathonCollection.insertOne(newEvent);
            res.send(result);
        });

        /**
         *
         * registration apis
         *
         */

        app.get("/registrations", async (req, res) => {
            const { title } = req.query;
            const query = {};

            if (title) {
                query.marathonTitle = { $regex: title, $options: "i" }; // case-insensitive search
            }

            try {
                const registrations = await registrationCollection
                    .find(query)
                    .toArray();
                res.send(registrations);
            } catch (error) {
                res.status(500).send({ message: error.message });
            }
        });

        // GET registration by id
        app.get("/registrations/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const registration = await registrationCollection.findOne(query);
            res.send(registration);
        });

        // DELETE registration by id
        app.delete("/registrations/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await registrationCollection.deleteOne(query);
            res.send(result);
        });

        // UPDATE registration by id
        app.patch("/registrations/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const updatedRegistration = req.body;
            const newValues = { $set: updatedRegistration };
            const result = await registrationCollection.updateOne(
                query,
                newValues
            );
            res.send(result);
        });

        // POST a new marathon registration
        app.post("/registrations", async (req, res) => {
            const newRegistration = req.body;
            const result = await registrationCollection.insertOne(
                newRegistration
            );

            // Increment the total registration count
            const marathonId = newRegistration.marathon_id;
            await marathonCollection.updateOne(
                { _id: new ObjectId(marathonId) },
                { $inc: { totalRegistrationCount: 1 } }
            );

            res.json(result);
        });

        // GET all marathon tips
        app.get("/marathonTips", async (req, res) => {
            const cursor = marathonTipsCollection.find();
            const tips = await cursor.toArray();
            res.send(tips);
        });
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("Marathon Event API is running...");
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
