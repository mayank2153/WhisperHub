import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPosts } from "../../api/postsApi.js";
import PostCard from "./postCard.jsx";
import Shimmer from "../shimmer/shimmer.jsx"

const url = import.meta.env.VITE_BASE_URL || 'http://localhost:8000/';

const HomePage = () => {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((state) => state.posts);

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  if (status === 'loading') {
    return <Shimmer />;
  }

  if (status === 'failed') {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div className="flex flex-col bg-[#0d1114] w-full max-h-screen overflow-y-auto items-center no-scrollbar py-8  lg:px-8 px-2 ">
      <div className="w-full max-w-screen-sm ">
        <div className="rounded-2xl  p-1 py-2 space-y-4">
        {
          items && items.data && items.data.length > 0 ? (
            items.data.map((item) => (
              <div className=" w-full mb-1" key={item._id}>
                <PostCard {...item} />
              </div>
            ))
          ) : (
            <div>No posts available</div>
          )
        }
        </div>
      </div>
    </div>
  );
};

export default HomePage;