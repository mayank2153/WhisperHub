import React, { useState } from 'react';
import CommentInputReply from './commentInputReply';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from 'axios';

const url = import.meta.env.VITE_BASE_URL;

const CommentDisplay = ({ _id, content, deleted, parentCommentId, post, updatedAt, owner, replies }) => {
  const [isReplying, setIsReplying] = useState(false);
  const { postId } = useParams();
  const user = useSelector(state => state.auth.user.data.user._id);

  const handleCommentDelete = async () => {
    try {
      console.log("Entered handleCommentDelete");
      const response = await axios.post(
        `${url}comments/delete-comment/${_id}`, 
        {}, 
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true
        }
      );
      console.log(response.data);
    } catch (error) {
      alert("Error deleting comment: " + error.message);
      console.log(error);
    }
  };
  

  const handleReply = () => {
    // Logic for handling reply
    setIsReplying(true);
  };

  return (
    <div className="comment w-[500px] ml-4">
      {owner && (
        <div className="owner-info flex items-center mb-4 gap-4">
          <img
            src={owner.avatar}
            alt={`Avatar of ${owner.userName}`}
            className="w-6 h-6 rounded-full mr-2"
          />
          <div>
            <span className="font-bold">{owner.userName}</span>
          </div>
        </div>
      )}
      {deleted ? (
        <div>
          <p>This comment is deleted</p>
        </div>
      ) : (
        <div>
          <p>{content}</p>
          <button onClick={handleReply} className="text-sm text-blue-500 hover:underline">
            Reply
          </button>
          {isReplying && (
            <div className="reply-input">
              {console.log(_id)}
              <CommentInputReply postId={postId} parentCommentId={parentCommentId || _id} {...owner} />
            </div>
          )}
          {owner._id === user && (
            <div>
              <button onClick={handleCommentDelete} className="text-sm text-red-500 hover:underline">Delete</button>
            </div>
          )}
          {replies && replies.map((reply) => (
            <React.Fragment key={reply._id}>
              <CommentDisplay {...reply} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentDisplay;