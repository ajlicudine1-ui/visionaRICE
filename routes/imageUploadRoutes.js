const express =
    require(
        'express'
    );

const multer =
    require(
        'multer'
    );

const {
    uploadPredictionImage
} =
    require(
        '../controllers/imageUploadController'
    );

const router =
    express.Router();

const upload =
    multer({
        storage:
            multer.memoryStorage(),

        limits: {
            fileSize:
                2 *
                1024 *
                1024
        },

        fileFilter:
            (
                req,
                file,
                callback
            ) => {
                const allowed =
                    new Set([
                        'image/jpeg',
                        'image/png',
                        'image/webp'
                    ]);

                if (
                    !allowed.has(
                        file.mimetype
                    )
                ) {
                    callback(
                        new Error(
                            'Only JPG, PNG, and WebP images are allowed.'
                        )
                    );

                    return;
                }

                callback(
                    null,
                    true
                );
            }
    });

router.post(
    '/prediction-image',
    (
        req,
        res,
        next
    ) => {
        upload.single(
            'image'
        )(
            req,
            res,
            error => {
                if (!error) {
                    next();
                    return;
                }

                if (
                    error.code ===
                    'LIMIT_FILE_SIZE'
                ) {
                    return res
                        .status(413)
                        .json({
                            success:
                                false,

                            message:
                                'Image is too large. Maximum upload size is 2 MB.'
                        });
                }

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        message:
                            error.message
                    });
            }
        );
    },
    uploadPredictionImage
);

module.exports =
    router;
