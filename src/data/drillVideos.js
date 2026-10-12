// Add hosted MP4 URLs by Lab drill_key or workout drill key.
// This map is shared by the paid drill guide and the public customer preview.
export const DRILL_VIDEOS = {
  // 'right-hand-pound': 'https://your-public-video-host/right-hand-pound.mp4',
};
export function getDrillVideo(drill = {}) {
  return drill.demo_video_url || DRILL_VIDEOS[drill.drill_key] || DRILL_VIDEOS[drill.sourceDrillKey] || DRILL_VIDEOS[drill.key] || null;
}
