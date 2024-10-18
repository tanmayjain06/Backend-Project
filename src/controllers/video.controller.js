import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    
    const { page = 1, limit = 10, query = "", sortBy = "createdAt", sortType = 1, userId = "" } = req.query

    
    let pipeline = [
        {
            $match: {
                $and: [
                    {
                        
                        $or: [
                            { title: { $regex: query, $options: "i" } },   
                            { description: { $regex: query, $options: "i" } }
                        ]
                    },
                   
                    ...( userId ? [ { Owner: new mongoose.Types.ObjectId( userId ) } ] : "" )  
                    
                ]
            }
        },
        
        {   
            $lookup: {
                from: "users",
                localField: "Owner",
                foreignField: "_id",
                as: "Owner",
                pipeline: [ 
                    {
                        $project: {
                            _id: 1,
                            fullName: 1,
                            avatar: "$avatar.url",
                            username: 1,
                        }
                    }
                ]
            }
        },
        {
            
            $addFields: {
                Owner: {
                    $first: "$Owner",  
                },
            },
        },
        {
            $sort: { [ sortBy ]: sortType }  
        }
    ];

    try
    {
        
        const options = {  
            page: parseInt( page ),
            limit: parseInt( limit ),
            customLabels: {   
                totalDocs: "totalVideos",
                docs: "videos",
            },
        };

        
        const result = await Video.aggregatePaginate( Video.aggregate( pipeline ), options );  

        if ( result?.videos?.length === 0 ) { return res.status( 404 ).json( new ApiResponse( 404, {}, "No Videos Found" ) ); }

        
        return res.status( 200 ).json( new ApiResponse( 200, result, "Videos fetched successfully" ) );

    } catch ( error )
    {
        console.error( error.message );
        return res.status( 500 ).json( new ApiError( 500, {}, "Internal server error in video aggregation" ) );
    }
})

const publishAVideo = asyncHandler(async (req, res) => {
    try
    {
        
        const { title, description } = req.body
        if ( [ title, description ].some( ( feild ) => feild.trim() === "" ) ) { throw new ApiError( 400, "Please provide all details" ) }

        
        const videoLocalPath = req.files?.videoFile[ 0 ]?.path
        const thumbnailLocalPath = req.files?.thumbnail[ 0 ]?.path

        if ( !videoLocalPath ) { throw new ApiError( 400, "Please upload video" ) }
        if ( !thumbnailLocalPath ) { throw new ApiError( 400, "Please upload thumbnail" ) }

       
        const videoOnCloudnary = await uploadOnCloudinary( videoLocalPath, "video" )
        const thumbnailOnCloudnary = await uploadOnCloudinary( thumbnailLocalPath, "img" )

        if ( !videoOnCloudnary ) { throw new ApiError( 400, "video Uploading failed" ) }
        if ( !thumbnailOnCloudnary ) { throw new ApiError( 400, "video Uploading failed" ) }


        
        const video = await Video.create( {
            title: title,
            description: description,
            thumbnail: thumbnailOnCloudnary?.url,
            videoFile: videoOnCloudnary?.url,
            duration: videoOnCloudnary?.duration,
            isPUblished: true,
            Owner: req.user?._id
        } )

        if ( !video ) { throw new ApiError( 400, "video Uploading failed" ) }

        return res.status( 200 )
            .json( new ApiResponse( 201, video, "Video Uploaded successfully" ) )

    } catch ( error )
    {
        return res.status( 501 )
            .json( new ApiError( 501, {}, "Problem in uploading video" ) )
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    try
    {
       
        const { videoId } = req.params

        
        if ( !isValidObjectId( videoId ) ) { throw new ApiError( 400, "Invalid VideoID" ) }

        
        const video = await Video.findById( videoId )

        if ( !video ) { throw new ApiError( 400, "Failed to get Video details." ) }

        return res.status( 200 )
            .json( new ApiResponse( 200, video, "Video found " ) )

    } catch ( error )
    {
        res.status( 501 )
            .json( new ApiError( 501, {}, "Video not found" ) )
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    try
    {
        
        const { videoId } = req.params
        if ( !isValidObjectId( videoId ) ) { throw new ApiError( 400, "Invalid VideoID" ) }

        
        const { title, description } = req.body
        if ( [ title, description ].some( ( feild ) => feild.trim() === "" ) ) { throw new ApiError( 400, "Please provide title, description, thumbnail" ) }


       
        const video = await Video.findById( videoId )
        if ( !video ) { throw new ApiError( 400, "Video not found" ) }

        
        if ( !video.Owner.equals( req.user._id ) ) { throw new ApiError( 400, {}, "You cant update this video" ) }

        
        const thumbnailLocalPath = req.file?.path
        if ( !thumbnailLocalPath ) { throw new ApiError( 400, "thumbnail not found" ) }

        const thumbnailOnCloudnary = await uploadOnCloudinary( thumbnailLocalPath, "img" )
        if ( !thumbnailOnCloudnary ) { throw new ApiError( 400, "thumbnail not uploaded on cloudinary" ) }

        
        const thumbnailOldUrl = video?.thumbnail
        const deleteThumbnailOldUrl = await deleteFromCloudinary( thumbnailOldUrl, "img" )
        if ( !deleteThumbnailOldUrl ) { throw new ApiError( 400, "thumbnail not deleted" ) }

       
        video.title = title
        video.description = description
        video.thumbnail = thumbnailOnCloudnary.url
        await video.save()

        return res.status( 200 )
            .json( new ApiResponse( 200, video, "Video details updated successfully" ) )

    } catch ( error )
    {
        console.log( error.stack )
        return res.status( 500 )
            .json( new ApiError( 500, {}, "video not updated" ) )
    }
} )



const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if ( !isValidObjectId( videoId ) ) { throw new ApiError( 400, "Invalid VideoID" ) }

    
    const video = await Video.findById( videoId )
    if ( !video ) { throw new ApiError( 400, "Invalid Video" ) }

    
    if ( !video.Owner.equals( req.user._id ) ) { throw new ApiError( 403, "You are not authorized to delete this video" ); }

    
    const videoFile = await deleteFromCloudinary( video.videoFile, "video" )
    const thumbnail = await deleteFromCloudinary( video.thumbnail, "img" )

    if ( !videoFile && !thumbnail ) { throw new ApiError( 400, "thumbnail or videoFile is not deleted from cloudinary" ) }

    
    await video.remove();  

    return res.status( 200 )
        .json( new ApiResponse( 200, {}, "Video Deleted successfully" ) )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    if ( !isValidObjectId( videoId ) ) { throw new Apierror( 400, "Invalid VideoID" ) }

   
    const toggleisPUblished = await Video.findOne(   
        {
            _id: videoId,    
            Owner: req.user._id, 
        },
    );

    if ( !toggleisPUblished ) { throw new Apierror( 400, "Invalid Video or Owner" ) }

    
    toggleisPUblished.isPUblished = !toggleisPUblished.isPUblished

    await toggleisPUblished.save()

    return res.status( 200 )
        .json( new ApiResponse( 200, toggleisPUblished.isPUblished, "isPUblished toggled successfully" ) )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}