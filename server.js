 require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 3000;


// ============================
// SUPABASE
// ============================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);


// ============================
// IMAGE UPLOAD
// ============================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});


app.use(express.json());


// ============================
// WEBSITE
// ============================

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ============================
// GET MEMORIES
// ============================

app.get("/memories", async (req, res) => {

    try {

        const { data, error } =
            await supabase
                .from("memories")
                .select("*")
                .order("created_at", {
                    ascending: false
                });

        if (error) {

            console.error(error);

            return res.status(500).json({
                error: error.message
            });
        }

        res.json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Could not load memories."
        });
    }
});


// ============================
// ADD MEMORY
// ============================

app.post(
    "/memories",
    upload.single("image"),
    async (req, res) => {

        try {

            const title =
                req.body.title;

            const description =
                req.body.description;

            let imageUrl = null;


            // UPLOAD IMAGE

            if (req.file) {

                const fileName =
                    Date.now() +
                    "-" +
                    req.file.originalname.replace(
                        /\s+/g,
                        "-"
                    );


                const { error: uploadError } =
                    await supabase.storage
                        .from("memory-images")
                        .upload(
                            fileName,
                            req.file.buffer,
                            {
                                contentType:
                                    req.file.mimetype,

                                upsert: false
                            }
                        );


                if (uploadError) {

                    console.error(uploadError);

                    return res.status(500).json({
                        error:
                            uploadError.message
                    });
                }


                const { data: publicUrlData } =
                    supabase.storage
                        .from("memory-images")
                        .getPublicUrl(
                            fileName
                        );


                imageUrl =
                    publicUrlData.publicUrl;
            }


            // SAVE MEMORY

            const { data, error } =
                await supabase
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

                return res.status(500).json({
                    error: error.message
                });
            }


            res.json(data[0]);

        } catch (error) {

            console.error(error);

            res.status(500).json({
                error: "Could not save memory."
            });
        }
    }
);


// ============================
// DELETE MEMORY
// ============================

app.delete(
    "/memories/:id",
    async (req, res) => {

        try {

            const id =
                req.params.id;


            console.log(
                "Trying to delete memory:",
                id
            );


            const { data, error } =
                await supabase
                    .from("memories")
                    .delete()
                    .eq("id", id)
                    .select();


            // SUPABASE ERROR

            if (error) {

                console.error(
                    "DELETE ERROR:",
                    error
                );

                return res.status(500).json({
                    error:
                        error.message
                });
            }


            // NOTHING WAS DELETED

            if (
                !data ||
                data.length === 0
            ) {

                console.log(
                    "No memory was deleted."
                );

                return res.status(404).json({
                    error:
                        "Memory was not deleted. Check the Supabase DELETE policy."
                });
            }


            // SUCCESS

            console.log(
                "Memory successfully deleted:",
                id
            );


            res.json({
                message:
                    "Memory deleted successfully"
            });


        } catch (error) {

            console.error(
                "DELETE ERROR:",
                error
            );

            res.status(500).json({
                error:
                    "Could not delete memory."
            });
        }
    }
);


// ============================
// START SERVER
// ============================

app.listen(
    PORT,
    () => {

        console.log(
            "Website running on port " +
            PORT
        );

    }
);
