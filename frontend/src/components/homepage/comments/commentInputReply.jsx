import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const url = import.meta.env.VITE_BASE_URL|| `http://localhost:8000/`;

const CommentInputReply = ({ postId , parentCommentId,userName}) => {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [comment, setComment] = useState("@"+userName);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [comment]);

  const handleComment = async () => {
    try {
        
      const response = await axios.post(`${url}comments/create-comment/${postId}`,
        { content: comment,parentCommentId: parentCommentId },
        { withCredentials: true });
      setComment(""); // Clear the comment input after successful submission
      setIsInputFocused(false)
      console.log("comment generated", response);
    } catch (error) {
      alert(error.response?.data?.message || "Unable to add comment");
    }
  };
  const handleClear=async()=>{
    setComment("");
  }

  return (
    <div className="items-center min-w-full max-w-lg border  border-slate-50 rounded-2xl m-2 px-2 py-1 ">
      <textarea
        ref={textareaRef}
        placeholder="Add a comment"
        className={`min-w-[300px] w-full bg-transparent focus:outline-none text-white  transition-all duration-200 resize-none  `}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onFocus={() => setIsInputFocused(true)}
      />
      
        <div className="flex justify-end gap-2">
        <button
          className="items-center justify-center px-2 py-1 text-sm font-semibold  transition-all duration-200 hover:bg-[#2e2b2b] border border-transparent rounded-full  mt-2"
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          className="items-center justify-center px-2 py-1 text-sm   font-semibold  transition-all duration-200 bg-blue-600 border border-transparent rounded-full hover:bg-blue-700 focus:bg-blue-700 mt-2"
          onClick={handleComment}
        >
          Comment
        </button>
      
        </div>
    </div>
  );
};

export default CommentInputReply;
