import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/user.model.js";

dotenv.config();

const BAD_URL = "https://geograpgyandyou.com/images/user-profile.png";
const GIRL_URL =
  "https://img.magnific.com/free-vector/woman-with-long-brown-hair-pink-shirt_90220-2940.jpg?semt=ais_hybrid&w=740&q=80";
const BOY_URL =
  "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTn01RfOkPxGN3wbFnSOzU82ZKePLeb0B-0O7Q3RwO2kw&s=10";

const run = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured in .env");
  }

  await mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 10 });
  console.log("Connected to MongoDB");

  const users = await User.find({ photoUrl: BAD_URL }).lean();
  console.log(`Found ${users.length} user(s) with the broken placeholder image`);

  let femaleCount = 0;
  let maleCount = 0;

  for (const user of users) {
    const replacement = user.gender === "female" ? GIRL_URL : BOY_URL;
    if (user.gender === "female") femaleCount++;
    else maleCount++;

    const current = user.photoUrl;
    let newPhotos;
    if (Array.isArray(current)) {
      newPhotos = current.map((url) => (url === BAD_URL ? replacement : url));
    } else if (typeof current === "string") {
      newPhotos = current === BAD_URL ? [replacement] : [current];
    } else {
      newPhotos = [replacement];
    }

    await User.updateOne(
      { _id: user._id },
      { $set: { photoUrl: newPhotos } }
    );

    console.log(
      `- ${user.firstName} ${user.lastName || ""} (${user.gender || "n/a"}) -> ${replacement}`
    );
  }

  console.log(
    `Done. Updated ${users.length} user(s): ${femaleCount} female, ${maleCount} male/other.`
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
