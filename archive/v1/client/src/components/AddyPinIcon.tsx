interface AddyPinIconProps {
  className?: string;
  size?: number;
}

export default function AddyPinIcon({ className = "", size = 24 }: AddyPinIconProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Pin base/shadow */}
      <ellipse cx="12" cy="21" rx="2" ry="1" fill="currentColor" opacity="0.3"/>
      
      {/* Main pin body */}
      <path 
        d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 14 6 14s6-8.75 6-14c0-3.314-2.686-6-6-6z" 
        fill="currentColor"
        opacity="0.9"
      />
      
      {/* Inner circle/marker */}
      <circle cx="12" cy="8" r="2.5" fill="white" opacity="0.95"/>
      
      {/* Small center dot */}
      <circle cx="12" cy="8" r="1" fill="currentColor"/>
      
      {/* Highlight/shine effect */}
      <path 
        d="M9.5 5.5C10.5 3.8 11.2 3 12 3c2.2 0 4 1.8 4 4 0 0.8-0.2 1.6-0.6 2.3" 
        stroke="white" 
        strokeWidth="0.8" 
        fill="none" 
        opacity="0.6"
        strokeLinecap="round"
      />
    </svg>
  );
}