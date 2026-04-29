import type { OnBeforeRenderAsync } from 'vike/types';

export const onBeforeRender: OnBeforeRenderAsync = async (pageContext) => {
  const urlParsed = pageContext.urlParsed;
  const isSuccess = urlParsed.search?.success === 'true';

  return {
    pageContext: {
      pageProps: {
        isSuccess,
      },
    },
  };
};
