import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface ParsedReview {
  title: string;
  content: string;
  pros: string[];
  cons: string[];
  rating: number;
}

function parseAIReview(content: string, rating: number): ParsedReview {
  // AI reviews are stored as: "Title\n\nContent\n\nPros:\n- Pro1\n- Pro2\n\nCons:\n- Con1\n- Con2"
  const lines = content.split('\n');
  let title = '';
  let reviewContent = '';
  const pros: string[] = [];
  const cons: string[] = [];
  
  let currentSection: 'title' | 'content' | 'pros' | 'cons' = 'title';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    if (line.toLowerCase().startsWith('pros:')) {
      currentSection = 'pros';
      continue;
    }
    
    if (line.toLowerCase().startsWith('cons:')) {
      currentSection = 'cons';
      continue;
    }
    
    if (currentSection === 'title' && !title) {
      title = line;
      currentSection = 'content';
      continue;
    }
    
    if (currentSection === 'content') {
      if (line.startsWith('-')) {
        // First bullet point, switch to pros
        currentSection = 'pros';
        pros.push(line.replace(/^-\s*/, ''));
      } else {
        reviewContent += (reviewContent ? '\n' : '') + line;
      }
      continue;
    }
    
    if (currentSection === 'pros' && line.startsWith('-')) {
      pros.push(line.replace(/^-\s*/, ''));
      continue;
    }
    
    if (currentSection === 'cons' && line.startsWith('-')) {
      cons.push(line.replace(/^-\s*/, ''));
      continue;
    }
  }
  
  // Fallback if parsing fails
  if (!title) {
    title = 'Hosting Service Review';
  }
  if (!reviewContent && content) {
    reviewContent = content;
  }
  
  return { title, content: reviewContent, pros, cons, rating };
}

function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg
          key={`full-${i}`}
          className="h-5 w-5 fill-yellow-400 text-yellow-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg
          className="h-5 w-5 fill-yellow-400/50 text-yellow-400"
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
          className="h-5 w-5 text-gray-300"
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
      <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
        {rating.toFixed(1)} / 5.0
      </span>
    </div>
  );
}

async function getServiceData(slug: string) {
  const service = await prisma.hostingService.findUnique({
    where: { slug },
    include: {
      reviews: {
        where: {
          author: 'AI Generated Review',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
      metrics: {
        where: {
          metricName: 'SEO Keyword',
        },
      },
    },
  });

  return service;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceData(slug);

  if (!service) {
    return {
      title: 'Service Not Found',
    };
  }

  const aiReview = service.reviews[0];
  const keywords = service.metrics
    .filter((m) => m.metricName === 'SEO Keyword')
    .map((m) => m.value);

  // Try to extract SEO metadata from review
  let seoTitle = `${service.name} Review - ${service.name} Hosting Review`;
  let metaDescription = service.description || `Comprehensive review of ${service.name} hosting service.`;

  if (aiReview) {
    const parsed = parseAIReview(aiReview.content, aiReview.rating);
    if (parsed.title) {
      seoTitle = parsed.title;
    }
    // Use first paragraph as description
    const firstParagraph = parsed.content.split('\n\n')[0];
    if (firstParagraph) {
      metaDescription = firstParagraph.substring(0, 160);
    }
  }

  return {
    title: seoTitle,
    description: metaDescription,
    keywords: keywords.length > 0 ? keywords.join(', ') : undefined,
    openGraph: {
      title: seoTitle,
      description: metaDescription,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description: metaDescription,
    },
  };
}

export default async function ServiceReviewPage({ params }: PageProps) {
  const { slug } = await params;
  const service = await getServiceData(slug);

  if (!service) {
    notFound();
  }

  const aiReview = service.reviews[0];
  const keywords = service.metrics
    .filter((m) => m.metricName === 'SEO Keyword')
    .map((m) => m.value);

  let parsedReview: ParsedReview | null = null;
  if (aiReview) {
    parsedReview = parseAIReview(aiReview.content, aiReview.rating);
  }

  // Calculate average rating from all reviews
  const allReviews = await prisma.review.findMany({
    where: { serviceId: service.id },
    select: { rating: true },
  });
  const averageRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : parsedReview?.rating || 0;

  // Structured data (JSON-LD)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Review',
    itemReviewed: {
      '@type': 'Service',
      name: service.name,
      description: service.description,
    },
    author: {
      '@type': 'Organization',
      name: 'HostingHub',
    },
    reviewRating: {
      '@type': 'Rating',
      ratingValue: averageRating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: parsedReview?.content || service.description || '',
    datePublished: aiReview?.createdAt.toISOString() || service.lastUpdated.toISOString(),
  };

  const features = Array.isArray(service.features)
    ? (service.features as string[])
    : service.features
      ? Object.values(service.features as Record<string, string>)
      : [];

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <Link
                href="/"
                className="text-2xl font-bold text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300"
              >
                HostingHub
              </Link>
              <nav className="flex gap-4">
                <Link
                  href="/"
                  className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  Home
                </Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <li>
                <Link href="/" className="hover:text-gray-900 dark:hover:text-white">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href="/services"
                  className="hover:text-gray-900 dark:hover:text-white"
                >
                  Services
                </Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 dark:text-white">{service.name}</li>
            </ol>
          </nav>

          {/* Service Header */}
          <div className="mb-8">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              {parsedReview?.title || `${service.name} Review`}
            </h1>

            {/* Rating */}
            <div className="mb-6 flex items-center gap-4">
              {renderStars(averageRating)}
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Based on {allReviews.length} {allReviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {/* Quick Info */}
            <div className="mb-6 flex flex-wrap gap-4 text-sm">
              {service.pricing && (
                <div className="rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Pricing: {service.pricing}
                  </span>
                </div>
              )}
              {service.cjAdvertiserId && (
                <div className="rounded-lg bg-green-100 px-4 py-2 dark:bg-green-900/20">
                  <span className="font-semibold text-green-800 dark:text-green-300">
                    Verified Partner
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Affiliate CTA - Top */}
          {service.affiliateLink && (
            <div className="mb-8 rounded-xl border-2 border-blue-500 bg-blue-50 p-6 dark:border-blue-400 dark:bg-blue-900/20">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                  Get Started with {service.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Special offers and discounts available
                </p>
              </div>
              <a
                href={service.affiliateLink}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="whitespace-nowrap rounded-lg bg-blue-600 px-8 py-3 text-center font-semibold text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Visit {service.name} →
              </a>
            </div>
            </div>
          )}

          {/* Review Content */}
          {parsedReview ? (
            <article className="prose prose-lg max-w-none dark:prose-invert">
              <div
                className="mb-8 text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: parsedReview.content
                    .split('\n\n')
                    .map((para) => `<p>${para}</p>`)
                    .join(''),
                }}
              />
            </article>
          ) : (
            <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-600 dark:text-gray-400">
                {service.description || 'Review content coming soon.'}
              </p>
            </div>
          )}

          {/* Pros and Cons */}
          {parsedReview && (parsedReview.pros.length > 0 || parsedReview.cons.length > 0) && (
            <div className="my-12 grid gap-6 md:grid-cols-2">
              {/* Pros */}
              {parsedReview.pros.length > 0 && (
                <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                    <svg
                      className="h-6 w-6 text-green-600 dark:text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Pros
                  </h2>
                  <ul className="space-y-3">
                    {parsedReview.pros.map((pro, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                      >
                        <svg
                          className="mt-1 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400"
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
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cons */}
              {parsedReview.cons.length > 0 && (
                <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
                  <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
                    <svg
                      className="h-6 w-6 text-red-600 dark:text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Cons
                  </h2>
                  <ul className="space-y-3">
                    {parsedReview.cons.map((con, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 text-gray-700 dark:text-gray-300"
                      >
                        <svg
                          className="mt-1 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Features */}
          {features.length > 0 && (
            <div className="my-12 rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
                Key Features
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                  >
                    <svg
                      className="mt-1 h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400"
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
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Affiliate CTA - Bottom */}
          {service.affiliateLink && (
            <div className="my-12 rounded-xl border-2 border-blue-500 bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-center dark:from-blue-700 dark:to-blue-800">
              <h2 className="mb-4 text-3xl font-bold text-white">
                Ready to Get Started?
              </h2>
              <p className="mb-6 text-lg text-blue-100">
                Join thousands of satisfied customers with {service.name}
              </p>
              <a
                href={service.affiliateLink}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="inline-block rounded-lg bg-white px-8 py-4 text-lg font-semibold text-blue-600 transition-transform hover:scale-105 dark:bg-gray-900 dark:text-blue-400"
              >
                Get Started with {service.name} →
              </a>
              {service.pricing && (
                <p className="mt-4 text-sm text-blue-100">
                  Starting at {service.pricing}
                </p>
              )}
            </div>
          )}

          {/* Keywords */}
          {keywords.length > 0 && (
            <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-700">
              <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
                Related Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 bg-white py-8 dark:border-gray-700 dark:bg-gray-900">
          <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-600 dark:text-gray-400 sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} HostingHub. All rights reserved.</p>
            <p className="mt-2">
              This review may contain affiliate links. We may earn a commission at no extra cost to
              you.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

