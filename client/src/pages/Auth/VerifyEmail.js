import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/Common/Loading';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await axios.get(`/api/auth/verify/${token}`);
        setStatus('success');
        toast.success('Email verified successfully!');
        setTimeout(() => navigate('/login'), 2000);
      } catch (error) {
        setStatus('error');
        toast.error('Invalid or expired verification token');
      }
    };

    if (token) {
      verifyEmail();
    }
  }, [token, navigate]);

  if (status === 'verifying') {
    return <Loading />;
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {status === 'success' ? (
            <div className="text-center">
              <h2>Email Verified!</h2>
              <p>Your email has been verified successfully. Redirecting to login...</p>
            </div>
          ) : (
            <div className="text-center">
              <h2>Verification Failed</h2>
              <p>The verification link is invalid or has expired.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;


