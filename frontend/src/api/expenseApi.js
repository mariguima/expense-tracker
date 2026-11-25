import { api } from "./client.js";

export async function getExpenses() {
  return (await api.get("/expenses")).data;
}

export async function postExpense(expenseData) {
  return (await api.post("/expenses", expenseData)).data;
}

export async function patchExpense(expenseId, expenseData) {
  return (await api.patch(`/expenses/${expenseId}`, expenseData)).data;
}

export async function deleteExpense(expenseId) {
  return (await api.delete(`/expenses/${expenseId}`)).data;
}

export async function getSummary(params) {
  return (await api.get("/expenses/summary", { params })).data;
}

export async function getSavingsSummary(end) {
  return (await api.get("/savings/summary", { params: { end } })).data;
}
