export function Loader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-transparent">
      <svg
        className="animate-spin h-5 w-5 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-50"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
