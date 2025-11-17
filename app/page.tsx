import { prisma } from '@/lib/prisma';
import Link from 'next/link';

interface HostingService {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  features: any;
  pricing: string | null;
  affiliateLink: string | null;
  reviews: {
    rating: number;
  }[];
}

async function getHostingServices(): Promise<HostingService[]> {
  try {
    const services = await prisma.hostingService.findMany({
      include: {
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: {
        lastUpdated: 'desc',
      },
    });

    return services;
  } catch (error) {
    console.error('Error fetching hosting services:', error);
    return [];
  }
}

function calculateAverageRating(reviews: { rating: number }[]): number {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10; // Round to 1 decimal place
}

function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg
          key={`full-${i}`}
          className="h-4 w-4 fill-yellow-400 text-yellow-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg
          className="h-4 w-4 fill-yellow-400/50 text-yellow-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <defs>
            <linearGradient id="half-fill">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            fill="url(#half-fill)"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg
          key={`empty-${i}`}
          className="h-4 w-4 text-gray-300"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

function parseFeatures(features: any): string[] {
  if (!features) return [];
  if (Array.isArray(features)) {
    return features;
  }
  if (typeof features === 'object') {
    return Object.values(features).filter((v): v is string => typeof v === 'string');
  }
  return [];
}

export default async function Home() {
  const services = await getHostingServices();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              HostingHub
            </h1>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Find the perfect hosting service
                </p>
                <Link
                  href="/admin"
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Admin
                </Link>
              </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Compare Top Hosting Services
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Discover the best web hosting providers with detailed reviews, ratings, and features
          </p>
        </div>

        {/* Services Grid */}
        {services.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400">
              No hosting services found. Add some services to get started!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const averageRating = calculateAverageRating(service.reviews);
              const features = parseFeatures(service.features);
              const reviewCount = service.reviews.length;

              return (
                <div
                  key={service.id}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
                >
                  {/* Card Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Rating */}
                    <div className="mt-4 flex items-center justify-between">
                      {averageRating > 0 ? (
                        <div className="flex items-center gap-2">
                          {renderStars(averageRating)}
                          {reviewCount > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          No reviews yet
                        </span>
                      )}
                    </div>

                    {/* Pricing */}
                    {service.pricing && (
                      <div className="mt-4">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {service.pricing}
                        </p>
                      </div>
                    )}

                    {/* Features */}
                    {features.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                          Key Features
                        </h4>
                        <ul className="space-y-1.5">
                          {features.slice(0, 4).map((feature, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
                            >
                              <svg
                                className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              <span className="line-clamp-1">{feature}</span>
                            </li>
                          ))}
                          {features.length > 4 && (
                            <li className="text-xs text-gray-500 dark:text-gray-400">
                              +{features.length - 4} more features
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Card Footer - CTA Buttons */}
                  <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                    <div className="flex gap-2">
                      <Link
                        href={`/services/${service.slug}`}
                        className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        View Details
                      </Link>
                      {service.affiliateLink && (
                        <a
                          href={service.affiliateLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Visit Site
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 pt-8 text-center dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} HostingHub. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}
