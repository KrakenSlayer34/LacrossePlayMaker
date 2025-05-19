import { Link, useLocation } from "wouter";

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-green-700 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <div className="text-xl font-bold flex items-center cursor-pointer">
            <span className="mr-2">🥍</span>
            Lacrosse Playboard
          </div>
        </Link>
        
        <nav className="flex space-x-4">
          <Link href="/">
            <div className={`hover:text-green-200 cursor-pointer ${location === '/' ? 'font-bold underline' : ''}`}>
              Design
            </div>
          </Link>
          <a 
            href="https://github.com/your-username/lacrosse-playboard" 
            target="_blank" 
            className="hover:text-green-200"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}