import axios from "axios";
const url = import.meta.env.VITE_BASE_URL || 'http://localhost:8000/';

export const UserRegister = async(formData) => {
    try {
        const response  = await axios.post(`${url}users/register`, formData);
        console.log('response from user register', response.data);

    } catch (error) {
        console.log('error in user register', error);
        
    }
};