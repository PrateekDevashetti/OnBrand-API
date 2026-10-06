export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <span className="spin h-[22px] w-[22px] rounded-full border-[1.5px] border-cream/20 border-t-cream" />
    </div>
  );
}
