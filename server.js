 require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 3000;


// CONNECT TO SUPABASE

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);


// IMAGE UPLOAD

const upload = multer({

    storage: multer.memoryStorage(),

    limits: {
        fileSize: 20 * 1024 * 1024
    }

});


app.use(express.json());


// WEBSITE FILES

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// ============================
// GET ALL MEMORIES
// ============================

app.get(
    "/memories",
    async function(req, res) {

        try {

            const result =
                await supabase
                    .from("memories")
                    .select("*")
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    );


            if (result.error) {

                console.error(
                    result.error
                );

                return res
                    .status(500)
                    .json({
                        error:
                            result.error.message
                    });
            }


            res.json(
                result.data
            );


        } catch (error) {

            console.error(error);

            res
                .status(500)
                .json({
                    error:
                        "Could not load memories."
                });

        }

    }
);


// ============================
// ADD MEMORY
// ============================

app.post(
    "/memories",
    upload.single("image"),
    async function(req, res) {

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
                    req.file.originalname
                        .replace(
                            /\s+/g,
                            "-"
                        );


                const uploadResult =
                    await supabase
                        .storage
                        .from(
                            "memory-images"
                        )
                        .upload(
                            fileName,
                            req.file.buffer,
                            {
                                contentType:
                                    req.file.mimetype,

                                upsert: false
                            }
                        );


                if (
                    uploadResult.error
                ) {

                    console.error(
                        uploadResult.error
                    );

                    return res
                        .status(500)
                        .json({
                            error:
                                uploadResult
                                    .error
                                    .message
                        });
                }


                const publicUrl =
                    supabase
                        .storage
                        .from(
                            "memory-images"
                        )
                        .getPublicUrl(
                            fileName
                        );


                imageUrl =
                    publicUrl
                        .data
                        .publicUrl;

            }


            // SAVE MEMORY

            const insertResult =
                await supabase
                    .from("memories")
                    .insert([
                        {
                            title:
                                title,

                            description:
                                description,

                            image_url:
                                imageUrl
                        }
                    ])
                    .select();


            if (
                insertResult.error
            ) {

                console.error(
                    insertResult.error
                );

                return res
                    .status(500)
                    .json({
                        error:
                            insertResult
                                .error
                                .message
                    });
            }


            res.json(
                insertResult.data[0]
            );


        } catch (error) {

            console.error(error);

            res
                .status(500)
                .json({
                    error:
                        "Could not save memory."
                });

        }

    }
);


// ============================
// DELETE MEMORY
// ============================

app.delete(
    "/memories/:id",
    async function(req, res) {

        try {

            const id =
                req.params.id;


            console.log(
                "Deleting memory:",
                id
            );


            const deleteResult =
                await supabase
                    .from("memories")
                    .delete()
                    .eq(
                        "id",
                        id
                    );


            if (
                deleteResult.error
            ) {

                console.error(
                    deleteResult.error
                );

                return res
                    .status(500)
                    .json({
                        error:
                            deleteResult
                                .error
                                .message
                    });
            }


            res.json({
                message:
                    "Memory deleted successfully"
            });


        } catch (error) {

            console.error(error);

            res
                .status(500)
                .json({
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
    function() {

        console.log(
            "Website running on port " +
            PORT
        );

    }
);
