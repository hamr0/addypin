export default function Logo() {
  return (
    <div className="flex items-center">
      <img 
        src="/landing-logo.png" 
        alt="addypin logo" 
        className="h-8 w-auto"
        data-testid="logo-image"
      />
    </div>
  );
}
