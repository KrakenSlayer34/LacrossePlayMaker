/// <reference types="vite/client" />

declare module '@assets/*' {
  const content: any;
  export default content;
}