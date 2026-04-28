import type { OnBeforeRenderAsync } from 'vike/types';

export const onBeforeRender: OnBeforeRenderAsync = async () => {
  return {
    pageContext: {
      pageProps: {},
    },
  };
};
