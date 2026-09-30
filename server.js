require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = 3000;

// Connect to Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Store uploaded images in memory temporarily
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

// Allow JSON
app.use(express.json());

// Serve the website
app.use(express.static(path.join(__dirname, "public")));

// Get all memories
app.get("/memories", async (req, res) => {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Add a new memory
app.post("/memories", upload.single("image"), async (req, res) => {
  try {
    const { title, description } = req.body;

    let imageUrl = null;

    // Upload picture if one was selected
    if (req.file) {
      const fileName =
        Date.now() + "-" + req.file.originalname.replace(/\s+/g, "-");

      const { error: uploadError } = await supabase.storage
        .from("memory-images")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false
        });

      if (uploadError) {
        console.error(uploadError);
        return res.status(500).json({ error: uploadError.message });
      }

      const { data: publicUrlData } = supabase.storage
        .from("memory-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    // Save memory in database
    const { data, error } = await supabase
      .from("memories")
      .insert([
        {
          title: title,
          description: description,
          image_url: imageUrl
        }
      ])
      .select();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Website running at http://localhost:${PORT}`);
});