// Outfit and style presets for the avatar. Colors are applied to the model's
// own materials at runtime (no extra downloads). `top` replaces the shirt's
// texture with a plain color, keeping its folds (normal map).
export const LOOKS = [
  { id: 'dev', label: 'Dev', top: '#272c35', bottom: '#5b6b85', hair: '#3a2c25', glasses: true, desc: 'Charcoal crewneck, dark denim' },
  { id: 'midnight', label: 'Midnight', top: '#0f1115', bottom: '#2f3540', hair: '#3a2c25', glasses: true, desc: 'All black' },
  { id: 'navy', label: 'Navy', top: '#1d2b4a', bottom: '#48556b', hair: '#3a2c25', glasses: false, desc: 'Navy knit, slate trousers' },
  { id: 'olive', label: 'Olive', top: '#3b4430', bottom: '#4a4f57', hair: '#3a2c25', glasses: true, desc: 'Olive tee, grey chinos' },
  { id: 'trading', label: 'Floor', top: '#d9dde4', bottom: '#2b3240', hair: '#3a2c25', glasses: true, desc: 'Light shirt, dark trousers' },
]
export const SKIN = '#e9c2a6' // warm tint over the skin texture
