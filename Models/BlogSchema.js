// models/Blog.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: String,   // user id or name
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const blogSchema = new mongoose.Schema({
  userName: String,
  textArea: String,
  image: String,
  likes: { type: Number, default: 0 },
  likedUsers: [String],   // store user IDs who liked
  comments: [commentSchema]
});

export default mongoose.model("Blog", blogSchema);
