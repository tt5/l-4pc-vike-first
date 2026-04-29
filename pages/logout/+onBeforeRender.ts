import type { OnBeforeRenderAsync } from 'vike/types';

export const onBeforeRender: OnBeforeRenderAsync = async (pageContext) => {
  console.log('onBeforeRender called!');
  const urlParsed = pageContext.urlParsed;
  console.log('urlParsed:', urlParsed);
  const isSuccess = urlParsed.search?.success === 'true';
  console.log('isSuccess:', isSuccess);

  return {
    pageContext: {
      pageProps: {
        isSuccess,
      },
    },
  };
};
