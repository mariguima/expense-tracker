import axios from "axios";

  const API_URL = "http://127.0.0.1:5000";

  export async function signup(userData) {
    const response = await axios.post(`${API_URL}/signup`, userData);
    return response.data;
  }

  export async function login(credentials) {
    const response = await axios.post(`${API_URL}/login`, credentials);
    return response.data;
  }