import { useFeed } from '../hooks/useItems';
import ItemRow from './ItemRow';

export default function FeedView() {
  const { data, isLoading } = useFeed();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-sm" style={{ color: '#9F9F97' }}>Loading...</span>
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-sm" style={{ color: '#9F9F97' }}>
          Nothing here yet
        </span>
        <span className="text-xs mt-1" style={{ color: '#C8C8C0' }}>
          Sync to pull in your GitHub activity
        </span>
      </div>
    );
  }

  return (
    <div>
      {data.items.map((item) => (
        <ItemRow key={item.id} item={item} showLayer />
      ))}
    </div>
  );
}
