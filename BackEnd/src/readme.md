app.use("/" , (req , res)=> res.send("hello));
In this its like a wildcard it try to match the api end point (route) if any route start with /(anything) then this callback will be executed.

Like / , /jhdsh / 1811 anything will be map to this route only .
even if we had more routes like

if we do app.use("/") then it will match to every HTTP method API calls to /.

app.use("/hello" , (req , res) => res.send("Hello Hello)) 

even if we try to go to route /hello but still the / route will be hit.


odering of routes is very important.

learn about ? , * and + in routes.

learn about regex in routes

learn about req.query and req.params

read in express  documentation for routing.


from any of request handler if you send back any response then it will not go to next handler even if we call next();

the code after res.send() also executed .

if we are calling next() and there is no route handler after this , so express will give error -> Cannot Get /
can send array of funtions in route handlers.

to run middleware for every type of request coming e.g. POST PUT GET .... we wrap that middleware using app.use("/routename)


 "mongodb+srv://officialthakur94:AnujSingh9690@devtinder.gjyq6.mongodb.net/(xyz)"
 
 then it will connect to specfic database xyz inside the cluster.


JS object Vs JSON

### Mongoose Important things

 In **Mongoose** (a MongoDB ODM for Node.js), **Schema** and **Model** are fundamental concepts:

### 1. **Schema**
A **Schema** defines the structure of documents within a collection in MongoDB. It specifies:
   - The **fields** (keys) and their **data types** (e.g., `String`, `Number`, `Boolean`, etc.).
   - Any **validation rules** (e.g., required fields, default values).
   - Relationships between fields.
   - Methods and middleware for interacting with data.

👉 Example of a Mongoose Schema:
```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, min: 18 },
  createdAt: { type: Date, default: Date.now }
});
```

---

### 2. **Model**
A **Model** is a constructor function created from a Schema. It provides an interface to interact with the database, allowing you to:
   - **Create** documents.
   - **Read** (find) documents.
   - **Update** documents.
   - **Delete** documents (CRUD operations).

👉 Example of a Mongoose Model:
```javascript
const User = mongoose.model('User', userSchema);
```
Now, we can use the `User` model to perform database operations.

---

### 3. **Using the Model to Perform Operations**
👉 **Creating a User:**
```javascript
const newUser = new User({
  name: "John Doe",
  email: "john@example.com",
  age: 25
});

newUser.save()
  .then(() => console.log("User saved!"))
  .catch(err => console.error(err));
```

👉 **Finding Users:**
```javascript
User.find({ age: { $gte: 18 } }) // Find all users aged 18+
  .then(users => console.log(users))
  .catch(err => console.error(err));
```

---

### **Summary**
| Concept  | Description |
|----------|------------|
| **Schema** | Defines the structure of a MongoDB document (fields, types, validation rules, etc.). |
| **Model** | A constructor function that creates and manipulates documents in the database. |

Would you like a more in-depth explanation or examples? 🚀



## Things need to know in Mongoose

If you're a **backend developer** working with **Mongoose**, here are the **main things** you should know:

---

## 📌 **1. Connecting to MongoDB**
Before using Mongoose, you need to connect to MongoDB.  
Example:
```javascript
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/myDatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("Connection error", err));
```

---

## 📌 **2. Schema & Model**
Mongoose uses **Schema** to define the structure of documents and **Model** to interact with the database.

### **Defining a Schema**
```javascript
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, min: 18 },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
```

### **Creating a Model**
```javascript
const User = mongoose.model('User', userSchema);
```

---

## 📌 **3. CRUD Operations**
### 🔹 **Create (Insert) a Document**
```javascript
const newUser = new User({ name: "John", email: "john@example.com", age: 25 });
newUser.save()
  .then(user => console.log("User saved:", user))
  .catch(err => console.error(err));
```

### 🔹 **Read (Find) Documents**
```javascript
User.find({ age: { $gte: 18 } })  // Find all users aged 18+
  .then(users => console.log(users))
  .catch(err => console.error(err));

User.findOne({ email: "john@example.com" }) // Find a single user
  .then(user => console.log(user));
```

### 🔹 **Update Documents**
```javascript
User.updateOne({ email: "john@example.com" }, { age: 30 })
  .then(result => console.log(result))
  .catch(err => console.error(err));

User.findByIdAndUpdate("userIdHere", { isAdmin: true }, { new: true })
  .then(user => console.log(user));
```

### 🔹 **Delete Documents**
```javascript
User.deleteOne({ email: "john@example.com" })
  .then(result => console.log(result))
  .catch(err => console.error(err));

User.findByIdAndDelete("userIdHere")
  .then(user => console.log("Deleted:", user));
```

---

## 📌 **4. Schema Features**
### 🔹 **Data Types**
Mongoose supports different data types:
- `String`, `Number`, `Boolean`, `Date`, `Buffer`, `ObjectId`, `Array`, `Mixed`.

Example:
```javascript
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  tags: [String], // Array of strings
  details: { type: mongoose.Schema.Types.Mixed } // Can be anything
});
```

### 🔹 **Default Values**
```javascript
const userSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: true }
});
```

### 🔹 **Required Fields**
```javascript
const userSchema = new mongoose.Schema({
  email: { type: String, required: true }
});
```

### 🔹 **Validation**
```javascript
const userSchema = new mongoose.Schema({
  age: { type: Number, min: 18, max: 65 }
});
```

---

## 📌 **5. Virtuals**
**Virtual properties** are fields that don't get stored in MongoDB but are derived from other fields.

Example:
```javascript
userSchema.virtual("fullName").get(function() {
  return this.firstName + " " + this.lastName;
});
```

Usage:
```javascript
const user = new User({ firstName: "John", lastName: "Doe" });
console.log(user.fullName); // "John Doe"
```

---

## 📌 **6. Middleware (Hooks)**
Mongoose allows pre and post **hooks** (middleware) for schema operations.

### 🔹 **Pre-save Hook**
```javascript
userSchema.pre("save", function(next) {
  console.log("Before saving user:", this);
  next();
});
```

### 🔹 **Post-save Hook**
```javascript
userSchema.post("save", function(doc, next) {
  console.log("User saved:", doc);
  next();
});
```

---

## 📌 **7. Query Methods**
You can add **custom methods** to models.

### 🔹 **Instance Methods**
```javascript
userSchema.methods.greet = function() {
  return `Hello, my name is ${this.name}`;
};

const user = new User({ name: "John" });
console.log(user.greet()); // "Hello, my name is John"
```

### 🔹 **Static Methods**
```javascript
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email });
};

User.findByEmail("john@example.com")
  .then(user => console.log(user));
```

---

## 📌 **8. Population (Reference & Joins)**
You can reference another collection using **ObjectId**.

### **Example Schema with Reference**
```javascript
const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  product: String
});
```

### **Populating Data**
```javascript
Order.find().populate("user")
  .then(order => console.log(order));
```

---

## 📌 **9. Indexing for Performance**
Indexes speed up queries.
```javascript
userSchema.index({ email: 1 }, { unique: true });
learn about compound indexes and also why should not make every field has index
```

---

## 📌 **10. Transactions (Atomic Operations)**
If you need **ACID transactions**, use **MongoDB sessions**.

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  const user = await User.create([{ name: "John" }], { session });
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
} finally {
  session.endSession();
}
```

---

## **🔥 Summary: What You Must Know**
| Topic | What You Should Know |
|-------|----------------------|
| **Connecting** | How to connect Mongoose to MongoDB |
| **Schema & Models** | Define schemas & create models |
| **CRUD Operations** | Insert, Find, Update, Delete |
| **Data Validation** | Required, min/max, default values |
| **Middleware** | Pre/post hooks (before/after save) |
| **Query Methods** | Instance & static methods |
| **Population** | Referencing other collections |
| **Indexes** | Speeding up queries |
| **Transactions** | Ensuring atomic operations |

Would you like me to expand on any of these topics? 🚀



In MongoDB, every document has two special fields by default:  

---

## 🔹 **1. `_id` (ObjectId)**
### **What is `_id`?**
- `_id` is a **unique identifier** for each document in a MongoDB collection.
- It is automatically created by MongoDB if not provided.
- By default, it is of type **ObjectId**, a 12-byte value that ensures uniqueness.

### **Structure of ObjectId**
ObjectId consists of **12 bytes**:
| Bytes | Description |
|--------|------------|
| 4 bytes | Timestamp (when the document was created) |
| 5 bytes | Unique identifier (machine & process ID) |
| 3 bytes | Incrementing counter (ensures uniqueness) |

👉 **Example of `_id`:**  
```json
{ "_id": ObjectId("64f8a7bfa8b59c12f8e6d9a4"), "name": "John Doe" }
```

### **Custom `_id`**
You can set your own `_id` instead of MongoDB’s default:
```javascript
const user = new User({ _id: "custom_id", name: "Alice" });
```

---

## 🔹 **2. `__v` (Version Key)**
### **What is `__v`?**
- `__v` is the **version key** added by **Mongoose** (not MongoDB).
- It is used for **document versioning** when using Mongoose’s **schema updates**.
- It helps track **changes in documents** when using **optimistic concurrency control**.

👉 **Example of `__v`:**  
```json
{ "_id": ObjectId("64f8a7bfa8b59c12f8e6d9a4"), "name": "John Doe", "__v": 0 }
```
Here, `__v: 0` means it's the first version.

### **How to Disable `__v`?**
If you don’t need versioning, disable it like this:
```javascript
const userSchema = new mongoose.Schema({
  name: String
}, { versionKey: false });
```

---

## 🔥 **Summary**
| Field | Description |
|-------|------------|
| **`_id`** | Unique identifier for each document (default: ObjectId) |
| **`__v`** | Mongoose version key (used for schema updates & versioning) |

Would you like a deeper explanation on ObjectId or versioning? 🚀



jwt token --> header(red) , payload(purple) , signature( sky blue)