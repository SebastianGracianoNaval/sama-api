import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const showToast = (message, type = 'error') => {
  const options = {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  switch (type) {
    case 'success':
      toast.success(message, options);
      break;
    case 'warning':
      toast.warning(message, options);
      break;
    default:
      toast.error(message, options);
  }
};

const Toast = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
  );
};

export default Toast; 