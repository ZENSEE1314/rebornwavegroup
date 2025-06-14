import { useQuery } from '@tanstack/react-query';
import { Users, TrendingUp, Calendar, Crown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface GenealogyNode {
  id: number;
  userId: string;
  name: string;
  email: string;
  level: number;
  earnings: number;
  joinDate: string;
  children?: GenealogyNode[];
}

interface GenealogyTreeData {
  totalDirectReferrals: number;
  totalLevel2Referrals: number;
  totalLevel3Referrals: number;
  totalEarnings: number;
  levels: GenealogyNode[];
}

export default function GenealogyTree() {
  const { t } = useLanguage();
  const { data: genealogyData, isLoading } = useQuery<GenealogyTreeData>({
    queryKey: ['/api/users/genealogy-tree'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!genealogyData || genealogyData.levels.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('referralProgram.noNetwork')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('referralProgram.shareLink')}
        </p>
      </div>
    );
  }

  const renderNode = (node: GenealogyNode, depth: number = 0) => {
    const marginLeft = depth * 40;
    const isLevel1 = depth === 0;
    const isLevel2 = depth === 1;
    const isLevel3 = depth === 2;

    return (
      <div key={node.id} className="relative">
        {/* Connection line */}
        {depth > 0 && (
          <div 
            className="absolute top-6 border-l-2 border-t-2 border-gray-300 dark:border-gray-600"
            style={{
              left: marginLeft - 20,
              width: 20,
              height: 1,
            }}
          />
        )}
        
        <div 
          className={`mb-4 ${depth > 0 ? 'ml-' + (depth * 10) : ''}`}
          style={{ marginLeft: marginLeft }}
        >
          <div className={`
            p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg
            ${isLevel1 ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-700' :
              isLevel2 ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-700' :
              'bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 dark:from-purple-900/20 dark:to-violet-900/20 dark:border-purple-700'}
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                  ${isLevel1 ? 'bg-blue-500' : isLevel2 ? 'bg-green-500' : 'bg-purple-500'}
                `}>
                  {isLevel1 && <Crown className="w-5 h-5" />}
                  {isLevel2 && <Users className="w-5 h-5" />}
                  {isLevel3 && <TrendingUp className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {node.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Level {node.level} • {node.email}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className={`
                  text-lg font-bold
                  ${isLevel1 ? 'text-blue-600 dark:text-blue-400' :
                    isLevel2 ? 'text-green-600 dark:text-green-400' :
                    'text-purple-600 dark:text-purple-400'}
                `}>
                  {formatCurrency(node.earnings)}
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(node.joinDate)}
                </div>
              </div>
            </div>
            
            {node.children && node.children.length > 0 && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {node.children.length} referral{node.children.length > 1 ? 's' : ''} • 
                {formatCurrency(node.children.reduce((sum, child) => sum + child.earnings, 0))} earnings
              </div>
            )}
          </div>
        </div>
        
        {/* Render children */}
        {node.children && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {genealogyData.totalDirectReferrals}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Level 1</div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {genealogyData.totalLevel2Referrals}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Level 2</div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {genealogyData.totalLevel3Referrals}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Level 3</div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(genealogyData.totalEarnings)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</div>
        </div>
      </div>

      {/* Genealogy Tree */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Your Referral Genealogy Tree
        </h3>
        
        <div className="space-y-2">
          {genealogyData.levels.map(node => renderNode(node))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Legend</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-gray-700 dark:text-gray-300">Level 1: Direct referrals (10% commission)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-700 dark:text-gray-300">Level 2: Indirect referrals (5% commission)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
            <span className="text-gray-700 dark:text-gray-300">Level 3: Sub-referrals (2% commission)</span>
          </div>
        </div>
      </div>
    </div>
  );
}