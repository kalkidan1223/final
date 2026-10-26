import { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import EthiopianChildHome from '../../components/child/EthiopianChildHome';

export default function ChildDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axiosClient.get('/child/dashboard');
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Please log in to continue');
      } else {
        setError(err.response?.data?.error || 'We could not load your learning space. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return <EthiopianChildHome data={data} loading={loading} error={error} onRetry={fetchDashboard} />;
}
