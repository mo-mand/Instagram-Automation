import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import ScheduledPosts from './pages/ScheduledPosts';
import PostedPosts from './pages/PostedPosts';
import ActivityLog from './pages/ActivityLog';
import Whitelist from './pages/Whitelist';
import Settings from './pages/Settings';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="scheduled" element={<ScheduledPosts />} />
          <Route path="posted" element={<PostedPosts />} />
          <Route path="logs" element={<ActivityLog />} />
          <Route path="whitelist" element={<Whitelist />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
