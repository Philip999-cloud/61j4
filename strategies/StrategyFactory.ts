
import { GradingStrategy } from './GradingStrategy';
import { LegacyStrategy } from './LegacyStrategy';
import { PhysicsStrategy } from './PhysicsStrategy';
import { ChemistryStrategy } from './ChemistryStrategy';
import { BiologyStrategy } from './BiologyStrategy';
import { EarthScienceStrategy } from './EarthScienceStrategy';
import { IntegratedScienceStrategy } from './IntegratedScienceStrategy';
import { AstMathAStrategy } from './AstMathAStrategy';
// 確保匯入新的策略
import { GsatMathAStrategy } from './GsatMathAStrategy';
import { GsatMathBStrategy } from './GsatMathBStrategy';
import { EnglishStrategy } from './EnglishStrategy';

export class StrategyFactory {
  static getStrategy(subjectName: string): GradingStrategy {
    const normalized = subjectName.toLowerCase();

    if (normalized.includes('物理') || normalized.includes('physics')) {
      return new PhysicsStrategy();
    }
    if (normalized.includes('化學') || normalized.includes('chemistry')) {
      return new ChemistryStrategy();
    }
    if (normalized.includes('生物') || normalized.includes('biology')) {
      return new BiologyStrategy();
    }
    if (normalized.includes('地球科學') || normalized.includes('地科') || normalized.includes('earth science')) {
      return new EarthScienceStrategy();
    }
    if (normalized.includes('自然') || normalized.includes('跨科') || normalized.includes('integrated science')) {
      return new IntegratedScienceStrategy();
    }
    
    // 數學科細分 - Expanded matching for robustness
    if (normalized.includes('數甲') || normalized.includes('數學甲') || normalized.includes('math a (ast)')) {
      return new AstMathAStrategy();
    }
    if (normalized.includes('數a') || normalized.includes('數學a') || normalized.includes('math a (gsat)')) {
      return new GsatMathAStrategy();
    }
    if (normalized.includes('數b') || normalized.includes('數學b') || normalized.includes('math b')) {
      return new GsatMathBStrategy();
    }

    // 英文科
    if (normalized.includes('英文') || normalized.includes('english')) {
      return new EnglishStrategy();
    }

    // 預設/其他科目
    return new LegacyStrategy();
  }
}
