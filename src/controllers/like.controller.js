import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    

    if ( !isValidObjectId( videoId ) ) { throw new ApiError( 400, "Invalid Video" ) }

    
    const VideoLike = await Like.findOne( {
        $and: [ { likedBy: req.user?._id }, { video: videoId } ]
    } )


   
    if ( VideoLike )
    {
        const unLike = await Like.findByIdAndDelete( VideoLike._id )

        return res.status( 200 )
            .json( new ApiResponse( 200, unLike, "Like removed" ) )
    }

    
    const Liked = await Like.create( {
        likedBy: req.user?._id,
        video: videoId
    } )

    return res.status( 200 )
        .json( new ApiResponse( 200, Liked, "Like added" ) )
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    

    if ( !isValidObjectId( commentId ) ) { throw new ApiError( 400, "Invalid comment" ) }

   
    const commentLike = await Like.findOne( {
        $and: [ { likedBy: req.user?._id }, { comment: commentId } ]
    } )

    
    if ( commentLike )
    {
        const unLike = await Like.findByIdAndDelete( commentLike._id )

        return res.status( 200 )
            .json( new ApiResponse( 200, unLike, "Like removed" ) )
    }

    
    const Liked = await Like.create( {
        likedBy: req.user?._id,
        comment: commentId
    } )

    return res.status( 200 )
        .json( new ApiResponse( 200, Liked, "Like added" ) )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    

    if ( !isValidObjectId( tweetId ) ) { throw new ApiError( 400, "Invalid tweet" ) }

    
    const tweetLike = await Like.findOne( {
        $and: [ { likedBy: req.user?._id }, { tweet: tweetId } ]
    } )

    
    if ( tweetLike )
    {
        const unLike = await Like.findByIdAndDelete( tweetLike._id )

        return res.status( 200 )
            .json( new ApiResponse( 200, unLike, "Like removed" ) )
    }

   
    const Liked = await Like.create( {
        likedBy: req.user?._id,
        tweet: tweetId
    } )

    return res.status( 200 )
        .json( new ApiResponse( 200, Liked, "Like added" ) )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    const LikedVideos = await Like.find( {
        $and: [ { likedBy: req.user?._id }, { video: { $exists: true } } ]
    } )

    if ( !LikedVideos ) { throw new ApiError( 500, "Liked Videos Not Found!" ) }

    
    return res.status( 200 )
        .json( new ApiResponse( 200, { "Total_Videos": LikedVideos.length, "Videos": LikedVideos }, "Videos found!" ) )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}