import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { FaRegComment } from 'react-icons/fa';
import { AiOutlineLike, AiOutlineDislike } from 'react-icons/ai';
import { Link } from 'react-router-dom';
import { fetchOwnerDetails } from '../../api/fetchOwnerDetails.js';
import { fetchCategoryDetails } from '../../api/fetchCategoryDetails.js';
import { MdEdit } from "react-icons/md";

const url = import.meta.env.VITE_BASE_URL || 'http://localhost:8000/';

const PostCard = ({ title, description, owner, votes, updatedAt, media, comments, category, _id }) => {
  const [ownerDetails, setOwnerDetails] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState(null);
  const [error, setError] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [hoveredPost , setHoveredPost] = useState(null);

  const currentUser = useSelector((state) => state.auth.user?.data?.user?._id);

  const handleVote = async (voteType) => {
    try {
      const response = await axios.post(`${url}vote/create-vote/${_id}`, { voteType }, {
        withCredentials: true
      });
      console.log('Vote response:', response.data);
      setUserVote(voteType);
      // Optionally update the UI with the new vote
    } catch (error) {
      console.error('Error casting vote:', error);
      alert(error.response?.data?.message || "Error casting vote");
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [ownerResponse, categoryResponse] = await Promise.all([
          fetchOwnerDetails(owner),
          fetchCategoryDetails(category)
        ]);
        setOwnerDetails(ownerResponse);
        setCategoryDetails(categoryResponse);
      } catch (error) {
        setError('Error fetching details');
        console.error('Error fetching details:', error);
      }
    };

    fetchDetails();
  }, [owner, category]);

  useEffect(() => {
    if (currentUser) {
      const userVote = votes.find(vote => vote.voteOwner === currentUser);
      if (userVote) {
        setUserVote(userVote.voteType);
      }
      console.log("currentUser:", currentUser);
    }
  }, [currentUser, votes]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  const voteCount = votes.length;
  const commentCount = comments.length;
  return (
    <div className="post-card bg-[#13181d] shadow-md w-[500px] max-h-[500px] min-w-[600px] rounded-lg py-1 mt-2  ">
      <div className=' rounded-2xl py-4 px-8'
          onMouseEnter={() => setHoveredPost(true)}
          onMouseLeave={() => setHoveredPost(false)}
      >

        <div className='flex gap-10 justify-between'>
          {ownerDetails && (
            <div className="owner-info flex items-center mb-4 gap-4 text-white">
              <img
                src={ownerDetails.avatar}
                alt={`Avatar of ${ownerDetails.userName}`}

                className="w-10 h-10 rounded-full mr-2"
              />
              <div>
                <span className="font-bold">{ownerDetails.userName}</span>
                <p className='text-sm'> {new Date(updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          <div className='flex-col '>
          
            {/* <Link to={`/posts/category/${categoryDetails?._id}`}> */}
            <p className='text-sm text-white relative'>{categoryDetails?.name}</p>
          {/* </Link> */}
          {
              hoveredPost === true &&
              currentUser===owner &&
              <Link to={`/post/edit-post/${_id}`}>
              <div className='flex bg-[#13181d]  rounded-full gap-1 cursor-pointer pr-1  justify-end transition-all duration-700'> 
                  <p className='text-xl text-slate-400'><MdEdit /></p>
                </div>
              </Link>
            }
          </div>
          
        </div>
        <div>
          <div>
            <Link to={`/post/${_id}`} >
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-[#9bb7b8]">{description}</p>
            </Link>
            {media && (
              <div className="media mt-4 rounded-2xl border border-slate-200 flex justify-center ">
                <a href={media} target="_blank" rel="noopener noreferrer">
                  <img src={media} alt="Media content" className="max-w-[500px] max-h-[300px]" />
                </a>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500 flex gap-10 mt-2">
            <div className='flex gap-2'>
              <div className={`flex   rounded-full gap-1 cursor-pointer
              ${userVote===null?'bg-[#222020]':null}
              ${userVote === "upvote" ?  'bg-green-500 text-white': null  }
              ${userVote==="downvote"?'bg-red-600 text-white':null}
              
              `}>
                <AiOutlineLike
                  size={30}
                  className={`p-1 rounded-full
                    ${userVote===null?'hover:text-green-600':null}
                    ${userVote === "upvote" ?  'text-green-500 bg-green-300': null  }
                    ${userVote === "downvote" ? ' hover:bg-red-600' : null}
                    duration-200
                    `}
                  onClick={() => handleVote("upvote")}
                  
                />
                <Link to={`/post/${_id}`} >
                  <p className='text-xl'>{voteCount}</p>
                </Link>
                <AiOutlineDislike
                  size={30}
                  
                  className={`p-1 rounded-full 
                  ${userVote===null?'hover:text-red-600':null}  
                  ${userVote === "downvote" ? 'text-red-500 bg-red-300' : null}
                  ${userVote === "upvote" ? ' hover:bg-green-600' : null}
                    duration-200
                  `}
                  onClick={() => handleVote("downvote")}
                />
              </div>
              
            </div>
            <Link to={`/post/${_id}`}>
              <div className='flex bg-[#13181d]  rounded-full gap-1 cursor-pointer pr-1'>
                <FaRegComment size={30} className='hover:text-blue-500 p-1 hover:bg-[#1c1a1a] rounded-full'/>
                <p className='text-xl'>Comments</p>
              </div>
            </Link>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;