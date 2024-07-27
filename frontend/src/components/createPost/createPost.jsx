import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { fetchCategories } from "../../api/fetchAllCategories";
import axios from "axios";
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { MdDriveFolderUpload } from "react-icons/md";

const url = import.meta.env.VITE_BASE_URL || `http://localhost:8000/`;

function Previews({ setFormData }) {
    const [files, setFiles] = useState([]);
    const { getRootProps, getInputProps } = useDropzone({
        accept: 'image/*',
        onDrop: acceptedFiles => {
            setFiles(acceptedFiles.map(file => Object.assign(file, {
                preview: URL.createObjectURL(file)
            })));
            setFormData(prevData => ({
                ...prevData,
                media: acceptedFiles[0]
            }));
        }
    });

    const handleDelete = () => {
        setFiles([]);
        setFormData(prevData => ({
            ...prevData,
            media: null
        }));
    };

    const thumbs = files.map(file => (
        <div className="relative inline-flex rounded border border-gray-300 mb-2 mr-2 p-1 box-border min-w-max" key={file.name}>
            <button onClick={handleDelete} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">X</button>
            <div className="flex min-w-0 overflow-hidden">
                <img
                    src={file.preview}
                    className="block w-auto h-24"
                    onLoad={() => { URL.revokeObjectURL(file.preview) }}
                />
            </div>
        </div>
    ));

    useEffect(() => {
        return () => files.forEach(file => URL.revokeObjectURL(file.preview));
    }, [files]);

    return (
        <section className="container h-max min-w-max">
            <div {...getRootProps({ className: 'dropzone' })} className={`p-4 rounded cursor-pointer w-full ${files.length ? 'hidden' : ''}`}>
                <div className='flex items-center gap-2'>
                    <p>Drag and Drop images or </p>
                    <MdDriveFolderUpload />
                </div>
                <div>
                    <input {...getInputProps()} className="-z-10" />
                </div>
            </div>
            <aside className="flex flex-wrap mt-4 w-full">
                {thumbs}
            </aside>
        </section>
    );
}

const CreatePost = () => {
    const [categories, setCategories] = useState([]);
    const currentUser = useSelector((state) => state.auth.user?.data?.user?._id);
    const [selectedColor, setSelectedColor] = useState('#13181d'); 
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        category: "",
        title: "",
        description: "",
        owner: "",
        media: null,
    });

    useEffect(() => {
        const getCategories = async () => {
            try {
                const categories = await fetchCategories();
                setCategories(categories);
            } catch (error) {
                console.error("Error fetching categories", error);
            }
        };
        getCategories();
    }, []);

    useEffect(() => {
        if (currentUser) {
            setFormData(prevData => ({
                ...prevData,
                owner: currentUser,
            }));
        }
    }, [currentUser]);

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));

        // Update selected color if category changes
        if (name === "category") {
            const selectedCategory = categories.find(category => category.name === value);
            if (selectedCategory) {
                setSelectedColor(selectedCategory.color);
            } else {
                setSelectedColor('#13181d'); // Reset to default if no category is selected
            }
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            const response = await axios.post(`${url}posts/create-post`, data, {
                withCredentials: true
            });
            console.log("Response", response);
            navigate("/");
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="w-full flex bg-[#13181d] pb-10 justify-center">
            <div className="flex flex-col bg-[#0d1114] items-center mt-28 rounded-2xl ml-[255px] max-h-[100vh] text-white  px-10 py-5 min-w-[600px] gap-4 ">
                <h1 className="text-3xl">Create Post</h1>
                <div>
                    <form onSubmit={handleSubmit} className="flex flex-col text-2xl gap-8 min-w-[400px] w-[400px]">
                        <select 
                            name="category" 
                            id="category" 
                            onChange={handleChange} 
                            value={formData.category} 
                            className="rounded-full w-min items-center text-xl py-1 px-1 focus:outline-none"
                            style={{ backgroundColor: selectedColor }}
                        >
                            <option value="" disabled className='bg-[#13181d]'>Select Category</option>
                            {categories.map(category => (
                                <option 
                                    key={category._id} 
                                    value={category.name} 
                                    style={{  backgroundColor:"#13181d" }}
                                >
                                    {category.name}
                                </option>
                            ))}
                        </select>

                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="Title"
                            className="min-h-16 px-2 py-4 text-white bg-transparent border-t-2 border-t-slate-300 focus:outline-none"
                        />

                        <input
                            type="text"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Description"
                            className="min-h-20 px-2 py-4 text-white bg-transparent border-t-2 border-slate-300 focus:outline-none"
                            required
                        />
                        <div className='rounded border-dashed border-2 h-40 px-5 py-3 border-slate-300'>
                            <Previews setFormData={setFormData} />
                        </div>

                        <div className='flex justify-end'>
                            <input type="submit" value="Submit" className="rounded-full text-lg bg-blue-600 text-white cursor-pointer w-20 hover:bg-blue-700"/>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreatePost;
