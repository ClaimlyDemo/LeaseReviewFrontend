import { DashboardTopBar } from "@/components/dashboard-top-bar";
import { HomeSearchForm } from "@/components/home-search-form";

const homeDetailCards = [
  {
    title: "Monthly Expenses",
    value: "$0.00",
    footer: "Monthly Avg.",
    bgClass: "bg-yellow-50",
  },
  {
    title: "Utilities",
    value: "—",
    footer: "Connect with Plaid",
    bgClass: "bg-white",
  },
  {
    title: "Subscriptions",
    value: "—",
    footer: "Connect with Plaid",
    bgClass: "bg-white",
  },
  {
    title: "Household",
    value: "—",
    footer: "Connect with Plaid",
    bgClass: "bg-white",
  },
] as const;

const homeImprovementCards = [
  { title: "Home Improvement", value: "—", footer: "Plan projects", bgClass: "bg-blue-50" },
  { title: "Services", value: "0", footer: "All current", bgClass: "bg-green-50" },
  { title: "Insurance", value: "—", footer: "Upload policy", bgClass: "bg-purple-50" },
  { title: "Family Members", value: "1", footer: "Manage household", bgClass: "bg-stone-100" },
] as const;

export default function HomePage() {
  return (
    <div className="pb-14 pt-6">
      <DashboardTopBar />

      <div className="pt-10 mb-12">
        <h1 className="text-[28px] font-serif text-gray-400 font-light tracking-tight">
          Welcome back, Jay.
        </h1>
        <h2 className="text-[36px] font-serif text-black font-normal tracking-tight leading-tight mt-1">
          It&apos;s Monday, April 6. How can we help?
        </h2>
      </div>

      <section aria-label="Search">
        <HomeSearchForm />
      </section>

      <section className="mt-8" aria-labelledby="get-started-heading">
        <h2 id="get-started-heading" className="mb-4 text-[28px] font-medium tracking-tight text-black">
          Get Started
        </h2>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <article className="flex min-h-[176px] items-center justify-between rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
            <div className="max-w-[62%]">
              <h3 className="text-2xl font-semibold tracking-tight text-black">Sync your transactions</h3>
              <p className="mt-2 text-sm text-gray-500">
                Connect your bank to see utilities, subscriptions, and household spending in one place.
              </p>
              <button
                type="button"
                className="mt-5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm"
              >
                Connect with Plaid
              </button>
            </div>
            <div className="h-28 w-28 rounded-xl bg-gray-50" aria-hidden />
          </article>

          <article className="flex min-h-[176px] items-center justify-between rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
            <div className="max-w-[62%]">
              <h3 className="text-2xl font-semibold tracking-tight text-black">Add an inspection report</h3>
              <p className="mt-2 text-sm text-gray-500">
                Upload your home inspection to get an AI summary and analysis. We&apos;ll create a few projects for you.
              </p>
              <button
                type="button"
                className="mt-5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm"
              >
                Add report
              </button>
            </div>
            <div className="h-28 w-28 rounded-xl bg-gray-50" aria-hidden />
          </article>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="home-details-heading">
        <h2
          id="home-details-heading"
          className="mb-4 text-2xl font-medium tracking-tight text-black"
        >
          Home details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {homeDetailCards.map(({ title, value, footer, bgClass }) => (
            <article
              key={title}
              className={`h-[160px] rounded-[24px] p-5 ${bgClass} flex flex-col justify-between`}
            >
              <h3 className="text-sm font-medium text-gray-800">{title}</h3>
              <p className="text-4xl font-normal text-gray-900">{value}</p>
              <p className="text-[11px] text-gray-400">{footer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="home-improvement-heading">
        <h2 id="home-improvement-heading" className="mb-4 text-2xl font-medium tracking-tight text-black">
          Home Improvement
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {homeImprovementCards.map(({ title, value, footer, bgClass }) => (
            <article
              key={title}
              className={`h-[160px] rounded-[24px] p-5 ${bgClass} flex flex-col justify-between`}
            >
              <h3 className="text-sm font-medium text-gray-800">{title}</h3>
              <p className="text-4xl font-normal text-gray-900">{value}</p>
              <p className="text-[11px] text-gray-400">{footer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
            <p className="mt-1 text-sm text-gray-500">Latest household transactions</p>
          </div>
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-24 w-24 rounded-lg bg-gray-50" aria-hidden />
              <p className="text-sm text-gray-500">No recent activity</p>
            </div>
          </div>
        </article>

        <article className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <h2 className="text-lg font-medium text-gray-900">Equipment</h2>
          <p className="mt-1 text-sm text-gray-500">Track home equipment and service dates</p>
          <div className="flex min-h-[320px] items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-24 w-24 rounded-lg bg-gray-50" aria-hidden />
              <p className="text-sm text-gray-500">No equipment yet</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
