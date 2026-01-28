import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to provider dashboard by default
  return <Navigate to="/provider" replace />;
};

export default Index;
