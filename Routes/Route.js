import express from "express";
import Blog from "../Models/BlogSchema.js";
import multer from "multer";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../Models/UserSchema.js";

const router = express.Router();

// ---------- ADMIN LOGIN (no DB role) ----------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }

    // ✅ Hardcoded Admin login
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      console.log("Admin Login Successful");
      const token = jwt.sign({ email, role: "admin" }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      return res.json({
        token,
        role: "admin",
        userName: "Admin", // fallback name
      });
    }

    // ✅ Normal User login
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      role: "user",
      userName: user.name,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all Blogs
router.get("/", async (req, res) => {
  const blogs = await Blog.find();
  res.json(blogs);
});

// Get a Single Blog
router.get("/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  res.json(blog);
});

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Create Blog with image
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { userName, textArea } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const blog = new Blog({
      userName,
      image: imagePath,
      textArea,
    });

    await blog.save();
    res.json(blog);
  } catch (err) {
    console.error("Error creating blog:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/update/:id", async (req, res) => {
  console.log("Update request:", req.params.id, req.body);
  const updateBlog = await Blog.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  console.log("Updated:", updateBlog);
  res.json(updateBlog);
});

router.delete("/delete/:id", async (req, res) => {
  console.log("Delete request:", req.params.id);
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ message: "Blog deleted successfully" });
});

// Like/Unlike blog
router.put("/:id/like", async (req, res) => {
  const { userId } = req.body;
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(404).json({ error: "Blog not found" });

  // if already liked → remove (unlike)
  if (blog.likedUsers.includes(userId)) {
    blog.likedUsers = blog.likedUsers.filter(
      (id) => id && id.toString() !== userId
    );
    blog.likes = Math.max(0, blog.likes - 1);
  } else {
    // if not liked → add
    blog.likedUsers.push(userId);
    blog.likes += 1;
  }

  await blog.save();
  res.json(blog);
});

// Add comment
router.post("/:id/comment", async (req, res) => {
  const { user, text } = req.body;
  const blog = await Blog.findById(req.params.id);

  if (!blog) return res.status(404).json({ msg: "Blog not found" });

  blog.comments.push({ user, text });
  await blog.save();

  res.json(blog);
});

// Update comment
router.put("/:id/comment/:commentId", async (req, res) => {
  try {
    const { text } = req.body;
    const blog = await Blog.findById(req.params.id);

    if (!blog) return res.status(404).json({ msg: "Blog not found" });

    const comment = blog.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    comment.text = text;
    await blog.save();

    res.json(blog);
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ error: "Error updating comment" });
  }
});

// Delete comment
router.delete("/:id/comment/:commentId", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    // filter out the comment
    blog.comments = blog.comments.filter(
      (c) => c._id.toString() !== req.params.commentId
    );

    await blog.save();
    res.json(blog);
  } catch (err) {
    console.error("Error deleting comment:", err);
    res.status(500).json({ error: "Error deleting comment" });
  }
});

// Get blog with comments & likes
router.get("/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  res.json(blog);
});

export default router;
