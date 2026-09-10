import axios from "axios";

const API_URL = "http://127.0.0.1:5000";

function authConfig(token, config = {}) {
    return {
        ...config,
        headers: {
            ...config.headers,
            Authorization: `Bearer ${token}`,
        },
    };
}

// CRUD operations
export async function getExpenses(token) {
    const response = await axios.get(`${API_URL}/expenses`, authConfig(token));
    return response.data;
}

export async function postExpense(expenseData, token) {
    const response = await axios.post(`${API_URL}/expenses`, expenseData, authConfig(token));
    return response.data;
}

export async function patchExpense(expenseId, expenseData, token) {
    const response = await axios.patch(`${API_URL}/expenses/${expenseId}`, expenseData, authConfig(token));
    return response.data;
}

export async function deleteExpense(expenseId, token) {
    const response = await axios.delete(`${API_URL}/expenses/${expenseId}`, authConfig(token));
    return response.data;
}

// dashboard operations
export async function getSummary({ month, year }, token) {
    const response = await axios.get(
        `${API_URL}/expenses/summary`,
        authConfig(token, { params: { month, year } }),
    );
    return response.data;
}
