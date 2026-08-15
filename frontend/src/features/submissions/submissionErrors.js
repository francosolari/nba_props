import axios from 'axios';

export const getAxiosErrorMessage = (
  error,
  fallbackMessage = 'Something went wrong. Please try again.',
) => {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ERR_NETWORK') {
      return 'We could not reach the server. Check your connection and try again.';
    }
    return (
      error?.response?.data?.message
      || error?.response?.data?.detail
      || error?.message
      || fallbackMessage
    );
  }
  return error?.message || fallbackMessage;
};
