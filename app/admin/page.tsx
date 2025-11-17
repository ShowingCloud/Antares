'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateContent, getServices, getStats } from '@/lib/api/admin-client';

interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  pricing: string | null;
  affiliateLink: string | null;
  lastUpdated: Date;
  _count: {
    reviews: number;
    metrics: number;
  };
}

interface Stats {
  totalServices: number;
  totalReviews: number;
  totalMetrics: number;
  servicesWithAIReviews: number;
  servicesWithAffiliateLinks: number;
}

interface FormData {
  serviceName: string;
  cjAdvertiserId: string;
  categories: string;
  generateAIReview: boolean;
  scrapeReviews: boolean;
  scrapePricing: boolean;
  targetKeywords: string;
  customInstructions: string;
  skipExisting: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [formData, setFormData] = useState<FormData>({
    serviceName: '',
    cjAdvertiserId: '',
    categories: 'hosting,cloud',
    generateAIReview: true,
    scrapeReviews: true,
    scrapePricing: true,
    targetKeywords: '',
    customInstructions: '',
    skipExisting: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesData, statsData] = await Promise.all([
        getServices(),
        getStats(),
      ]);

      setServices(servicesData.services || []);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setFormData((prev) => ({
      ...prev,
      serviceName: service.name,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Parse categories
      const categories = formData.categories
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      // Parse keywords
      const targetKeywords = formData.targetKeywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const data = await generateContent({
        serviceName: formData.serviceName,
        cjAdvertiserId: formData.cjAdvertiserId || undefined,
        categories: categories.length > 0 ? categories : undefined,
        generateAIReview: formData.generateAIReview,
        scrapeReviews: formData.scrapeReviews,
        scrapePricing: formData.scrapePricing,
        targetKeywords: targetKeywords.length > 0 ? targetKeywords : undefined,
        customInstructions: formData.customInstructions || undefined,
        skipExisting: formData.skipExisting,
      });

      setSuccess(
        `Content generated successfully! Created ${data.data.reviewsCreated} reviews and ${data.data.metricsCreated} metrics.`
      );

      // Reset form
      setFormData({
        serviceName: '',
        cjAdvertiserId: '',
        categories: 'hosting,cloud',
        generateAIReview: true,
        scrapeReviews: true,
        scrapePricing: true,
        targetKeywords: '',
        customInstructions: '',
        skipExisting: false,
      });

      // Refresh data
      await fetchData();

      // Navigate to the service page if created
      if (data.data.hostingService?.slug) {
        setTimeout(() => {
          router.push(`/services/${data.data.hostingService.slug}`);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <nav className="flex gap-4">
              <a
                href="/"
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                Home
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        {stats && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Services
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalServices}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Reviews
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalReviews}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Metrics
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalMetrics}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                AI Reviews
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.servicesWithAIReviews}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                With Affiliate
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {stats.servicesWithAffiliateLinks}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Generate Review Form */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
              Generate New Review
            </h2>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="serviceName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Service Name *
                </label>
                <input
                  type="text"
                  id="serviceName"
                  name="serviceName"
                  required
                  value={formData.serviceName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Bluehost"
                />
              </div>

              <div>
                <label
                  htmlFor="cjAdvertiserId"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  CJ Advertiser ID (optional)
                </label>
                <input
                  type="text"
                  id="cjAdvertiserId"
                  name="cjAdvertiserId"
                  value={formData.cjAdvertiserId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., 123456"
                />
              </div>

              <div>
                <label
                  htmlFor="categories"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Categories (comma-separated)
                </label>
                <input
                  type="text"
                  id="categories"
                  name="categories"
                  value={formData.categories}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="hosting, cloud"
                />
              </div>

              <div>
                <label
                  htmlFor="targetKeywords"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Target Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  id="targetKeywords"
                  name="targetKeywords"
                  value={formData.targetKeywords}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="bluehost review, best hosting"
                />
              </div>

              <div>
                <label
                  htmlFor="customInstructions"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Custom Instructions (optional)
                </label>
                <textarea
                  id="customInstructions"
                  name="customInstructions"
                  rows={3}
                  value={formData.customInstructions}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Focus on WordPress hosting capabilities..."
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="generateAIReview"
                    checked={formData.generateAIReview}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Generate AI Review
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="scrapeReviews"
                    checked={formData.scrapeReviews}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Scrape Reviews
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="scrapePricing"
                    checked={formData.scrapePricing}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Scrape Pricing
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="skipExisting"
                    checked={formData.skipExisting}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Skip if Service Exists
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting || !formData.serviceName}
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {submitting ? 'Generating...' : 'Generate Review'}
              </button>
            </form>
          </div>

          {/* Services List */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Existing Services
              </h2>
              <button
                onClick={fetchData}
                disabled={loading}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-400">Loading...</div>
            ) : services.length === 0 ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-400">
                No services found
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      selectedService?.id === service.id
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                            {service.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-500">
                          <span>{service._count.reviews} reviews</span>
                          <span>•</span>
                          <span>{service._count.metrics} metrics</span>
                          {service.affiliateLink && (
                            <>
                              <span>•</span>
                              <span className="text-green-600 dark:text-green-400">Affiliate</span>
                            </>
                          )}
                        </div>
                      </div>
                      <a
                        href={`/services/${service.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="ml-4 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

