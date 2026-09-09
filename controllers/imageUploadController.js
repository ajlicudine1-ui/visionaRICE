const {
    cloudinary
} =
    require(
        '../config/cloudinary'
    );

const {
    supabaseAdmin
} =
    require(
        '../config/supabase'
    );


// =====================================================
// HELPERS
// =====================================================

function getSessionUserId(req) {
    return (
        req.session?.user?.id ||
        req.session?.user_id ||
        req.session?.userId ||
        null
    );
}


function uploadBufferToCloudinary(
    buffer,
    options
) {
    return new Promise(
        (
            resolve,
            reject
        ) => {
            const stream =
                cloudinary
                    .uploader
                    .upload_stream(
                        options,
                        (
                            error,
                            result
                        ) => {
                            if (error) {
                                reject(
                                    error
                                );
                                return;
                            }

                            resolve(
                                result
                            );
                        }
                    );

            stream.end(
                buffer
            );
        }
    );
}


// =====================================================
// POST /api/uploads/prediction-image
// multipart/form-data
// image=<file>
// prediction_id=<uuid/id>
// =====================================================

async function uploadPredictionImage(
    req,
    res
) {
    try {
        const userId =
            getSessionUserId(
                req
            );

        if (!userId) {
            return res
                .status(401)
                .json({
                    success:
                        false,

                    message:
                        'Not authenticated.'
                });
        }

        const predictionId =
            String(
                req.body?.prediction_id ||
                ''
            ).trim();

        if (!predictionId) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        'Prediction ID is required.'
                });
        }

        if (!req.file) {
            return res
                .status(400)
                .json({
                    success:
                        false,

                    message:
                        'Prediction image is required.'
                });
        }

        /*
         * Verify that this prediction belongs to
         * the currently logged-in user.
         */
        const {
            data: prediction,
            error: predictionError
        } =
            await supabaseAdmin
                .from(
                    'predictions'
                )
                .select(
                    'id, user_id, image_url'
                )
                .eq(
                    'id',
                    predictionId
                )
                .eq(
                    'user_id',
                    userId
                )
                .maybeSingle();

        if (predictionError) {
            console.error(
                'Prediction lookup error:',
                predictionError
            );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    message:
                        'Unable to verify prediction ownership.',

                    error:
                        predictionError.message
                });
        }

        if (!prediction) {
            return res
                .status(404)
                .json({
                    success:
                        false,

                    message:
                        'Prediction record not found.'
                });
        }

        /*
         * Stable public_id per prediction means a retry
         * replaces the same image instead of creating
         * duplicate files.
         */
        const publicId =
            `visionarice/predictions/${userId}/${predictionId}`;

        const uploaded =
            await uploadBufferToCloudinary(
                req.file.buffer,
                {
                    public_id:
                        publicId,

                    resource_type:
                        'image',

                    overwrite:
                        true,

                    invalidate:
                        true,

                    format:
                        'webp',

                    transformation: [
                        {
                            width:
                                800,

                            height:
                                800,

                            crop:
                                'limit',

                            quality:
                                'auto:good',

                            fetch_format:
                                'webp'
                        }
                    ]
                }
            );

        const imageUrl =
            uploaded.secure_url;

        const {
            data: updatedPrediction,
            error: updateError
        } =
            await supabaseAdmin
                .from(
                    'predictions'
                )
                .update({
                    image_url:
                        imageUrl
                })
                .eq(
                    'id',
                    predictionId
                )
                .eq(
                    'user_id',
                    userId
                )
                .select(
                    'id, image_url'
                )
                .single();

        if (updateError) {
            console.error(
                'Prediction image URL update error:',
                updateError
            );

            /*
             * Avoid leaving an orphaned Cloudinary asset
             * when the DB update fails.
             */
            await cloudinary
                .uploader
                .destroy(
                    publicId,
                    {
                        resource_type:
                            'image',

                        invalidate:
                            true
                    }
                )
                .catch(
                    destroyError => {
                        console.error(
                            'Cloudinary cleanup error:',
                            destroyError
                        );
                    }
                );

            return res
                .status(500)
                .json({
                    success:
                        false,

                    message:
                        'Image uploaded but the prediction could not be updated.',

                    error:
                        updateError.message
                });
        }

        return res
            .status(201)
            .json({
                success:
                    true,

                message:
                    'Prediction image uploaded successfully.',

                prediction:
                    updatedPrediction,

                image: {
                    url:
                        imageUrl,

                    public_id:
                        uploaded.public_id,

                    width:
                        uploaded.width,

                    height:
                        uploaded.height,

                    format:
                        uploaded.format,

                    bytes:
                        uploaded.bytes
                }
            });

    } catch (error) {
        console.error(
            'Prediction image upload error:',
            error
        );

        return res
            .status(500)
            .json({
                success:
                    false,

                message:
                    'Unable to upload prediction image.',

                error:
                    error.message
            });
    }
}


module.exports = {
    uploadPredictionImage
};
