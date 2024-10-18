import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
     
     const { content } = req.body
     if ( !content ) { throw new ApiError( 400, "Please write some TWEET!" ) }
 
     
     const postTweet = await Tweet.create( {
         owner: req.user?._id,
         content: content,
     } )
 
     if ( !postTweet ) { return new ApiError( 400, "Tweet not posted!" ) }
 
 
     return res.status( 200 )
         .json( new ApiResponse( 200, postTweet, "Tweet Posted!" ) )
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if ( !isValidObjectId( userId ) ) { throw new ApiError( 400, "Invalid USerId" ) }

    
    const userTweet = await Tweet.find( {
        owner: new mongoose.Types.ObjectId( userId )
    } )

    if ( userTweet.length === 0 ) { return new ApiError( 500, "No tweet found!" ) }

    
    return res.status( 200 )
        .json( new ApiResponse( 200, { "Total_Tweets": userTweet.length, "Tweet": userTweet }, "Tweets found!" ) )
})

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if ( !isValidObjectId( tweetId ) ) { throw new ApiError( 400, "Invalid tweet" ) }
    if ( !content ) { throw new ApiError( 400, "Please write something!" ) }

    
    const findTweet = await Tweet.findOne( {
        $and: [ { owner: new mongoose.Types.ObjectId( req.user?._id ) }, { _id: tweetId } ]
    } )

    if ( !findTweet ) { throw new ApiError( 400, "You are not authorized to update this tweet" ) }

    
    findTweet.content = content
    const updatedTweet = await findTweet.save()

    if ( !updatedTweet ) { throw new ApiError( 500, "Tweet not updated!" ) }

    return res.status( 200 )
        .json( new ApiResponse( 200, updatedTweet, "Tweet updated successfully" ) )
})

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    console.log( req.user._id )

    if ( !isValidObjectId( tweetId ) ) { throw new ApiError( 400, "Invalid Tweet" ) }

   
    const findTweet = await Tweet.findOne( {
        $and: [ { owner: new mongoose.Types.ObjectId( req.user?._id ) }, { _id: tweetId } ]
    } )

    if ( !findTweet ) { return res.status( 500 ).json( new ApiError( 500, {}, "You are not authorized to delete this tweet" ) ) }

    
    const delTweet = await Tweet.findByIdAndDelete( tweetId )

    return res.status( 200 )
        .json( new ApiResponse( 200, delTweet, "Tweet deleted successfully!" ) )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}