import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://verbalitserver.onrender.com",
  withCredentials: true,
});

export default axiosInstance;
