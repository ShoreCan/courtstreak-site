export const CONTROL_REVISION = 'CONTROL 02';
// COCO-17 mirror pairs, preserving the original person's anatomical side labels.
const mirrorOrder = [0,2,1,4,3,6,5,8,7,10,9,12,11,14,13,16,15];
export function physicalPoseSides(person, mirrored = false) {
  if (!person || !mirrored) return person;
  if (person.xy?.length !== 17 || person.confidence?.length !== 17) throw new Error('Unexpected body keypoint format.');
  return { ...person, xy: mirrorOrder.map(index => person.xy[index]),
    confidence: mirrorOrder.map(index => person.confidence[index]) };
}
