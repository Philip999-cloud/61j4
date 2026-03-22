// Plain *.svg import → URL string (for <img src=...> usage)
declare module '*.svg' {
  const src: string;
  export default src;
}

// *.svg?react import → React SVG component (Vite SVGR)
declare module '*.svg?react' {
  import * as React from 'react';
  const Component: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default Component;
}
