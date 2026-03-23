import { useState } from 'react';
import { useStatus } from './hooks/useStatus';
import SetupScreen from './components/SetupScreen';
import Header from './components/Header';
import LayerView from './components/LayerView';
import FeedView from './components/FeedView';
import SearchResults from './components/SearchResults';

export default function App() {
  const { data: status, isLoading } = useStatus();
  const [view, setView] = useState<'tabs' | 'feed'>('tabs');
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading || !status) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F7F4' }}>
        <span className="text-sm" style={{ color: '#9F9F97' }}>Loading...</span>
      </div>
    );
  }

  if (status.needsToken) {
    return <SetupScreen />;
  }

  const showSearch = searchQuery.length >= 2;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F7F4' }}>
      <Header
        status={status}
        view={view}
        onViewChange={setView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {showSearch ? (
        <SearchResults query={searchQuery} />
      ) : view === 'tabs' ? (
        <LayerView status={status} />
      ) : (
        <FeedView />
      )}
    </div>
  );
}
