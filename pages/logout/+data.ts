export { data }
export type Data = Awaited<ReturnType<typeof data>>

import type { PageContextServer } from 'vike/types';

async function data(pageContext: PageContextServer) {
  const urlParsed = pageContext.urlParsed;
  const isSuccess = urlParsed.search?.success === 'true';

  return {
    isSuccess,
  };
}
