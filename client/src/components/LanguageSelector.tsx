import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/lib/i18n';

export function LanguageSelector() {
  const { language, changeLanguage } = useTranslation();

  const getLanguageFlag = () => {
    switch (language) {
      case 'zh': return '🇨🇳';
      case 'id': return '🇮🇩';
      default: return '🇺🇸';
    }
  };

  const getLanguageLabel = () => {
    switch (language) {
      case 'zh': return '中文';
      case 'id': return 'ID';
      default: return 'EN';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-10 px-3 bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-sm transition-all duration-200 flex items-center space-x-2"
        >
          <Globe className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">{getLanguageFlag()}</span>
          <span className="text-sm font-medium text-gray-700">{getLanguageLabel()}</span>
          <span className="sr-only">Language selector</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg rounded-lg p-1">
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={`cursor-pointer rounded-md px-3 py-2 transition-colors duration-150 flex items-center ${
            language === 'en' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <span className="mr-3 text-lg">🇺🇸</span>
          <span className="font-medium">English</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('zh')}
          className={`cursor-pointer rounded-md px-3 py-2 transition-colors duration-150 flex items-center ${
            language === 'zh' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <span className="mr-3 text-lg">🇨🇳</span>
          <span className="font-medium">中文</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('id')}
          className={`cursor-pointer rounded-md px-3 py-2 transition-colors duration-150 flex items-center ${
            language === 'id' 
              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
              : 'hover:bg-gray-50 text-gray-700'
          }`}
        >
          <span className="mr-3 text-lg">🇮🇩</span>
          <span className="font-medium">Bahasa Indonesia</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}