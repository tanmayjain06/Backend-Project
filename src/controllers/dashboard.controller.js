import mongoose, { isValidObjectId } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Tweet } from "../models/tweet.model.js"
import { Comment } from "../models/comment.model.js"
import { User } from "../models/user.model.js"

const getChannelStats = asyncHandler(async (req, res) => {
    
    let { channel } = req.body
    
    
    channel = await User.findOne( { username: channel } )
    if ( !channel ) { throw new ApiError( 400, "Channel not found!" ) }

    const channelID = new mongoose.Types.ObjectId( channel?._id )

    if ( !isValidObjectId( channelID ) ) { throw new ApiError( 400, "channel not found" ) }

    
    const totalViewsAndVideos = await Video.aggregate( [
        {
            $match: {
                $and: [
                    { Owner: new mongoose.Types.ObjectId( channelID ) },
                    { isPUblished: true }
                ]
            }
        }, {
            $group: { 
                _id: "$Owner",
                totalViews: { $sum: "$views" }, 
                totalVideos: { $sum: 1 } 
            }
        },


    ] )

    
    const totalSubs = await Subscription.aggregate( [
        { $match: { channel: new mongoose.Types.ObjectId( channelID ) } },
        { $count: "totalSubcribers" } // Count the total subscribers
    ] )

    
    const totalTweets = await Tweet.aggregate( [
        { $match: { owner: new mongoose.Types.ObjectId( channelID ) } },
        { $count: "totalTweets" }
    ] )

    
    const totalComments = await Comment.aggregate( [
        { $match: { owner: new mongoose.Types.ObjectId( channelID ) } },
        { $count: "totalComments" }
    ] )

    
    const totalVideoLikes = await Like.aggregate( [
        {
            $match: {
                $and: [
                    { likedBy: new mongoose.Types.ObjectId( channelID ) },
                    { video: { $exists: true } }  // Find the likes on videos
                ]
            }
        },
        { $count: "totalVideoLikes" }
    ] )

    
    const totalCommentLikes = await Like.aggregate( [
        {
            $match: {
                $and: [
                    { likedBy: new mongoose.Types.ObjectId( channelID ) },
                    { Comment: { $exists: true } }
                ]
            }
        },
        { $count: "totalCommentLikes" }
    ] )

    
    const totalTweetLikes = await Like.aggregate( [
        {
            $match: {
                $and: [
                    { likedBy: new mongoose.Types.ObjectId( channelID ) },
                    { tweet: { $exists: true } }
                ]
            }
        },
        { $count: "totalTweetLikes" }
    ] )

    
    return res.status( 200 )
        .json( new ApiResponse( 200, {
            "totalViews": totalViewsAndVideos[ 0 ]?.totalViews,
            "totalVideos": totalViewsAndVideos[ 0 ]?.totalVideos,
            "totalSubs": totalSubs[ 0 ]?.totalSubcribers,
            "totalTweets": totalTweets[ 0 ]?.totalTweets,
            "totalComments": totalComments[ 0 ]?.totalComments,
            "totalVideoLikes": totalVideoLikes[ 0 ]?.totalVideoLikes,
            "totalCommentLikes": totalCommentLikes[ 0 ]?.totalCommentLikes,
            "totalTweetLikes": totalTweetLikes[ 0 ]?.totalTweetLikes
        }, "Stats of the chanel" ) )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    
    const { channelID } = req.body
    const { page = 1, limit = 10 } = req.query

    if ( !isValidObjectId( channelID ) ) { throw new ApiError( 400, "channel not found" ) }


    
    let pipeline = [ {
        $match: {
            $and: [
                { Owner: new mongoose.Types.ObjectId( channelID ) },
                { isPUblished: true }
            ]
        }
    },
    {
        
        $lookup: {
            from: 'users', 
            localField: 'Owner', 
            foreignField: '_id', 
            as: 'ownerDetails' 
        }
    },
    {
        
        $unwind: '$ownerDetails' 
    },
    {
       
        $addFields: {
            username: '$ownerDetails.username', 
            fullName: "$ownerDetails.fullName",
            avatar: "$ownerDetails.avatar"
        }
    },
    {
        $project: {
            
            ownerDetails: 0 
        }
    }
    ];

    const options = {
        page: parseInt( page ),
        limit: parseInt( limit ),
        customLabels: {
            totalDocs: "total_videos",
            docs: "Videos"
        }
    }

    const videos = await Video.aggregatePaginate( pipeline, options )

    if ( videos?.total_videos === 0 ) { throw new ApiError( 400, "Videos Not Found" ) }

    return res.status( 200 )
        .json( new ApiResponse( 200, { videos }, "Videos Found" ) )
})

export {
    getChannelStats, 
    getChannelVideos
    }