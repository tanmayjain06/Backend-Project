import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if ( !isValidObjectId( videoId ) ) { throw new ApiError( 400, "Invalid VIdeo" ) }

    
    let pipeline = [
        { $match: { video: new mongoose.Types.ObjectId( videoId ) } },
    ]

    const options = {
        page: parseInt( page ),
        limit: parseInt( limit ),
        customLabels: {
            totalDocs: "total_comments",
            docs: "Comments"
        }
    }

    
    const allCommnets = await Comment.aggregatePaginate( pipeline, options )

    if ( allCommnets?.total_comments === 0 ) { throw new ApiError( 400, "Comments not found" ) }

    return res.status( 200 )
        .json( new ApiResponse( 200, { "Commnets": allCommnets, "size": allCommnets.length } ) )
} )

const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if ( !isValidObjectId( videoId ) ) { throw new ApiError( 500, {}, "Invalid video" ) }
    if ( !content ) { throw new ApiError( 400, {}, "Please enter valid comment" ) }

    // 2. create a new comment and save it to the database
    const comment = await Comment.create( {
        content: content,
        video: videoId,
        owner: new mongoose.Types.ObjectId( req.user?._id )
    } )
    if ( !comment ) { throw new ApiError( 500, comment, "Comment not Saved to Db" ) }

    return res.status( 200 )
        .json( new ApiResponse( 200, comment, "Comment added successfully" ) )
})

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if ( !isValidObjectId( commentId ) ) { throw new ApiError( 400, "Invalid commentId" ) }
    if ( content.length === 0 ) { throw new ApiError( 400, "Invalid commentId" ) }

    
    const comment = await Comment.findOne( {
        _id: commentId,    
        owner: req.user._id   
    } )
    if ( !comment ) { throw new ApiError( 400, "comment not found" ) }

    
    comment.content = content

    await comment.save()

    return res.status( 200 )
        .json( new ApiResponse( 200, comment, "Comment updated successfully" ) )
})

const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if ( !isValidObjectId( commentId ) ) { throw new ApiError( 400, {}, "Invalid commentId" ) }

   
    const delComment = await Comment.deleteOne( {
        $and: [ { _id: commentId },    
        { owner: req.user._id } ]  
    } );
    if ( !delComment ) { throw new ApiError( 500, "comment not found" ) }

    
    if ( delComment.deletedCount === 0 ) { return res.status( 500 ).json( new ApiError( 500, "You are not authorized to delete this comment" ) ) }

    return res.status( 200 )
        .json( new ApiResponse( 200, delComment, "Comment deleted successfully" ) )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }