export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v2" />
      <path d="M21 14v-4" />
      <path d="M3 14v-4" />
      <path d="M12 18.5V14" />
      <path d="m21 14-9 4.5-9-4.5" />
      <path d="M3.27 10 12 14.5l8.73-4.5" />
      <path d="M12 22.5 3 17.25V14l9 4.5 9-4.5v3.25L12 22.5z" />
    </svg>
  );
}
