// Version configuration
// Change this value to deploy different versions:
// 1 = Original motivational quotes
// 2 = Redirect to Redbubble image
// 3 = Redirect to YouTube video

export const DEPLOY_VERSION: 1 | 2 | 3 = 1;

export const VERSION_CONFIG = {
  1: {
    name: 'Motivational Quotes',
    type: 'app' as const,
  },
  2: {
    name: 'Redbubble Image',
    type: 'redirect' as const,
    url: 'https://ih1.redbubble.net/image.4534607155.3519/flat,750x,075,f-pad,750x1000,f8f8f8.jpg',
  },
  3: {
    name: 'YouTube Video',
    type: 'redirect' as const,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
};
