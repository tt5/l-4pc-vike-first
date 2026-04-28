import type { OnBeforeRenderAsync } from 'vike/types';
import { requireAuth } from '../../server/auth-middleware';

export const onBeforeRender: OnBeforeRenderAsync = async (pageContext) => {
  const user = requireAuth(pageContext);

  return {
    pageContext: {
      pageProps: {
        user,
      },
    },
  };
};
