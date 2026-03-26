import type { MicroLessonSpec } from '../../types';
import { parseMicroLesson } from '../../utils/microLessonPayload';
import { ColorOscillationCard } from './ColorOscillationCard';
import { CoordinationMultiplyLesson } from './CoordinationMultiplyLesson';
import { OxidationTimelineLesson } from './OxidationTimelineLesson';

export function MicroLessonBlock({ lesson }: { lesson?: MicroLessonSpec | null | unknown }) {
  const spec: MicroLessonSpec | null =
    lesson == null ? null : parseMicroLesson(lesson);
  if (!spec) return null;

  if (spec.variant === 'oxidation_timeline') {
    return (
      <OxidationTimelineLesson
        title={spec.title}
        caption={spec.caption}
        steps={spec.steps}
        arrows={spec.arrows}
      />
    );
  }
  if (spec.variant === 'color_oscillation') {
    return (
      <ColorOscillationCard
        title={spec.title}
        caption={spec.caption}
        color_from={spec.color_from}
        color_to={spec.color_to}
      />
    );
  }
  if (spec.variant === 'coordination_multiply') {
    const teeth = spec.teeth_per_ligand ?? 2;
    const result = spec.result_coordination ?? spec.bidentate_count * teeth;
    return (
      <CoordinationMultiplyLesson
        title={spec.title}
        caption={spec.caption}
        bidentate_count={spec.bidentate_count}
        teeth_per_ligand={teeth}
        result_coordination={result}
      />
    );
  }
  return null;
}
