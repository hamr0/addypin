export default function Logo() {
  return (
    <div className="flex items-center space-x-2">
      <img 
        src="/addypin-logo.png" 
        alt="addypin logo" 
        className="h-8 w-auto"
        data-testid="logo-image"
      />
      <span 
        className="text-2xl font-bold text-gray-900 dark:text-white"
        style={{ fontFamily: 'Corben, serif' }}
        data-testid="logo-text"
      >
        addypin
      </span>
    </div>
  );
}
