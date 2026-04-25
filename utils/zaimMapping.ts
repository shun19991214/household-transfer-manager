import { ExpenseCategory } from '../types';

// Zaimのカテゴリ名 → アプリのExpenseCategoryへのマッピング
const ZAIM_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  '食費': '食費',
  '日用雑貨': '日用品',
  '交通': '交通費',
  '交際費': '交際費',
  'エンタメ': '交際費',
  '教育・教養': 'その他',
  '美容・衣服': 'その他',
  '医療・保険': '医療費',
  '通信': '通信費',
  '水道・光熱': '光熱費',
  '住まい': '家賃',
  'クルマ': '交通費',
  '税金': 'その他',
  '大型出費': 'その他',
  'その他': 'その他',
};

export function mapZaimCategory(zaimCategoryName: string): ExpenseCategory {
  return ZAIM_CATEGORY_MAP[zaimCategoryName] || 'その他';
}
