const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT;

const userRouter = require("./routes/user");
const postRouter = require("./routes/post");
const commentRouter = require("./routes/comment");
const friendRouter = require("./routes/friend");
const messageRouter = require("./routes/message");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/users", userRouter);
app.use("/posts", postRouter);
app.use("/comments", commentRouter);
app.use("/users", friendRouter);
app.use("/users", messageRouter);

app.use((req, res) => {
  res.status(404);

  // respond with json
  if (req.accepts("json")) {
    res.json({ success: false, msg: "Route not found" });
    return;
  }
});

try {
  app.listen(port, () => {
    console.log(`Fakebook API listening on port ${port}!`);
  });
} catch (error) {
  console.log(error);
}
