import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://jaisheartgadget.onrender.com').replace(/\/$/, '');

axios.defaults.baseURL = API_BASE_URL;

const token = localStorage.getItem('token');
if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

export default axios;

