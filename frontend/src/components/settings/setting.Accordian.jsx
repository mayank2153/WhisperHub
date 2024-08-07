import React, { useState } from "react";
import { IoMdSettings } from "react-icons/io";

const SettingAccordian = ({ title }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const toggleAccordian = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="accordian border-b-2 border-gray-600">
            <div 
                className="accordian-header cursor-pointer flex items-center gap-2 pl-6 pb-6"
                onClick={toggleAccordian}
            >
                <IoMdSettings className="text-white text-xl" />
                <span className="text-white  font-mono text-xl">{title}</span>
            </div>
            {isOpen && (
                <div className="accordian-content pb-4">
                    <div className="text-slate-200 pl-12 -mt-3 mb-1 cursor-pointer hover:underline transition-all duration-500">Change Email</div>
                    <div className="text-slate-200 pl-12 cursor-pointer hover:underline transition-all duration-500">Change Password</div>
                </div>
            )}
        </div>
    );
};

export default SettingAccordian;
