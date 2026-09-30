import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

export default function ReviewsPage() {
  return (
    <div className="max-w-[700px] mx-auto text-center py-20">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-6">
        <Star size={24} className="text-gray-300" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-3">My Reviews</h1>
      <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
        Reviews you leave for fundis will be listed here. Leaving a review is not available yet.
      </p>
      <Link
        to="/client/requests"
        className="inline-block mt-8 px-7 py-3 bg-gray-900 text-white font-semibold text-sm rounded-full hover:bg-black transition-all"
      >
        Go to My Requests
      </Link>
    </div>
  );
}
