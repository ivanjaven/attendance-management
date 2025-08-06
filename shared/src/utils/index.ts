import { ApiResponse } from "../types";

// Date utilities
export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const formatTime = (date: Date): string => {
  return date.toTimeString().split(" ")[0];
};

export const isLate = (timeIn: string, schoolStartTime: string): boolean => {
  return timeIn > schoolStartTime;
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidStudentId = (studentId: string): boolean => {
  return /^S\d{3,}$/.test(studentId);
};

// Student name utilities
export const getFullName = (
  firstName: string,
  lastName: string,
  middleName?: string
): string => {
  return middleName
    ? `${firstName} ${middleName} ${lastName}`
    : `${firstName} ${lastName}`;
};

// API utilities
export const createApiResponse = <T>(
  success: boolean,
  data?: T,
  message?: string,
  error?: string
): ApiResponse<T> => {
  return { success, data, message, error };
};
